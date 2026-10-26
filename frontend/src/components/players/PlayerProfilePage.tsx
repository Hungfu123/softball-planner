import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import type { ProfileScope } from '@/hooks/usePlayerProfile'
import { useToastContext } from '@/components/layout/Layout'
import { ArchiveIcon, ArchiveRestoreIcon, ChevronLeft, CrossBones, DotsVertical, Pencil } from '@/icons'
import { EmptyState, LoadingSkeleton, ResponsiveSheet, SELECT_PILL_CLASS, SELECT_PILL_STYLE } from '@/components/shared'
import { GENDER_LABELS, GENDER_SHORT } from '@/types'
import * as api from '@/api/client'
import { FormChart } from './FormChart'
import { CollapsibleCard } from './CollapsibleCard'
import { GameLog } from './GameLog'
import { GenderSheet } from './GenderSheet'
import { SeasonTable } from './SeasonTable'
import { UsagePanel } from './UsagePanel'
import { PositionBadges } from './PositionBadges'
import { useRolle } from '@/hooks/useRolle'
import { PositionProfileSheet } from './PositionProfileSheet'
import { StrengthsPanel } from './StrengthsPanel'
import type { PlayerFormPoint } from '@/types'

/** Lesbare Namen für die Positions-Schlüssel aus den Spiel-Statistiken. */
const POSITION_NAMES: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', FIRST_BASE: 'First Base', SECOND_BASE: 'Second Base',
  THIRD_BASE: 'Third Base', SS: 'Shortstop', LF: 'Left Field', CF: 'Center Field',
  RF: 'Right Field', EH: 'Extra Hitter',
}

/**
 * Spielerprofil: wer spielt wo, und wie läuft es gerade am Schlag.
 *
 * Der Kopf ist dunkel wie das Feld im Spieltag-Planner und trägt Name, Positionen
 * und die vier Kennzahlen, die man zuerst wissen will. Alles Weitere steht auf
 * Cream darunter: Form-Kurve, Einsatz, Teamvergleich und die gespielten Posten.
 */
export function PlayerProfilePage() {
  const { istAdmin } = useRolle()
  const { id } = useParams<{ id: string }>()
  const playerId = Number(id)
  const navigate = useNavigate()
  const toast = useToastContext()
  const [scope, setScope] = useState<ProfileScope>({ kind: 'all' })
  const { player, timeline, gameStats, battingField, usage, loading, scopeLoading, error, savePositions, rename, setArchived, setGender } =
    usePlayerProfile(playerId, scope)
  // Spielervergleich in der Form-Kurve: die Reihe des anderen wird bei Bedarf
  // nachgeladen und bleibt im Cache, damit Hin- und Herschalten nicht jedes Mal
  // einen Request kostet.
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [compareCache, setCompareCache] = useState<Record<number, PlayerFormPoint[]>>({})

  const [positionsOpen, setPositionsOpen] = useState(false)
  const [showAllPositions, setShowAllPositions] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [genderOpen, setGenderOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Klick daneben und Escape schließen das Menü — ohne das bleibt es beim Scrollen offen.
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    const fehlend = compareIds.filter(id => !compareCache[id])
    if (fehlend.length === 0) return
    let abgebrochen = false
    Promise.all(fehlend.map(id => api.getPlayerBattingTimeline(id).then(reihe => [id, reihe] as const)))
      .then(geladen => {
        if (abgebrochen) return
        setCompareCache(c => ({ ...c, ...Object.fromEntries(geladen) }))
      })
      .catch(() => { if (!abgebrochen) setCompareIds(ids => ids.filter(id => compareCache[id])) })
    return () => { abgebrochen = true }
  }, [compareIds, compareCache])

  /** Mitspieler zur Auswahl — ohne den Spieler selbst, alphabetisch. */
  const teammates = useMemo(
    () => battingField
      .filter(b => b.playerId !== playerId)
      .map(b => ({ playerId: b.playerId, playerName: b.playerName }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName, 'de')),
    [battingField, playerId],
  )

  /** Die Vergleichsreihen folgen demselben Zeitraum-Schnitt wie die eigene. */
  const compares = useMemo(
    () => compareIds.flatMap(id => {
      const roh = compareCache[id]
      const name = teammates.find(t => t.playerId === id)?.playerName
      if (!roh || !name) return []
      const points = scope.kind === 'year' ? roh.filter(p => p.year === scope.year)
        : scope.kind === 'season' ? roh.filter(p => p.seasonId === scope.seasonId)
        : roh
      return [{ playerId: id, playerName: name, points }]
    }),
    [compareIds, compareCache, teammates, scope],
  )

  const years = useMemo(
    () => [...new Set(timeline.map(p => p.year).filter((y): y is number => y != null))].sort((a, b) => b - a),
    [timeline],
  )
  // Saisons, in denen diese Person tatsächlich gespielt hat — die Liga-Saison und das
  // Wochenend-Turnier sind verschiedene Spiele, und genau so will man sie lesen.
  const seasons = useMemo(() => {
    // Die Zeitreihe ist chronologisch — erste Begegnung gewinnt, so standen die
    // Saisons auch im Kalender. Alphabetisch wäre eine zweite, fremde Ordnung.
    const byId = new Map<number, { seasonId: number; name: string; year: number | null }>()
    for (const p of timeline) {
      if (p.seasonId == null || byId.has(p.seasonId)) continue
      byId.set(p.seasonId, { seasonId: p.seasonId, name: p.seasonName ?? 'Ohne Saison', year: p.year })
    }
    return [...byId.values()].reverse()
  }, [timeline])
  const points = useMemo(() => {
    if (scope.kind === 'year') return timeline.filter(p => p.year === scope.year)
    if (scope.kind === 'season') return timeline.filter(p => p.seasonId === scope.seasonId)
    return timeline
  }, [timeline, scope])
  const totals = useMemo(() => sum(points), [points])
  // Beim Wechsel bleiben die alten Zahlen stehen und blassen ab, statt
  // die Karten gegen Skelette zu tauschen — die Seite soll nicht springen.
  const scopeFade = `transition-opacity duration-200 ${scopeLoading ? 'opacity-50' : ''}`

  if (loading) {
    return (
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4">
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="max-w-md mx-auto p-4">
        <EmptyState
          title="Spieler nicht gefunden"
          description={error ?? 'Vielleicht wurde er gelöscht. Zurück zum Kader.'}
          icon={<CrossBones size={48} />}
        />
        <div className="text-center mt-4">
          <Link to={istAdmin ? '/players' : '/'} className="text-sm font-semibold text-navy-700 hover:text-navy-900 underline">
            {istAdmin ? 'Zum Kader' : 'Zum Start'}
          </Link>
        </div>
      </div>
    )
  }

  const toggleArchived = async () => {
    const next = !player.archived
    try {
      await setArchived(next)
      toast.show(next
        ? 'Spieler archiviert — verschwindet aus Lineups und Statistik, Historie bleibt erhalten'
        : 'Spieler reaktiviert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const saveName = async () => {
    const name = draftName.trim()
    setEditingName(false)
    if (!name || name === player.name) return
    try {
      await rename(name)
      toast.show('Name geändert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md md:max-w-2xl lg:max-w-5xl mx-auto p-4 space-y-4">
        <button
          onClick={() => navigate(istAdmin ? '/players' : '/')}
          className="inline-flex items-center gap-1 min-h-11 -my-3 -ml-2 pl-2 pr-3 text-sm font-semibold text-gray-500 hover:text-navy-900 cursor-pointer"
        >
          <ChevronLeft size={16} />
          {istAdmin ? 'Kader' : 'Start'}
        </button>

        {/* Kopf — dunkel wie das Feld, damit Name und Zahlen zusammen eine Einheit bilden */}
        <header className="bg-spotlight text-spotlight-ink rounded-2xl px-5 py-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {editingName ? (
                <input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  autoFocus
                  aria-label="Name ändern"
                  className="font-headline text-3xl sm:text-4xl font-extrabold uppercase tracking-wide bg-navy-800 text-white rounded-lg px-2 py-1 outline-none ring-2 ring-navy-500 w-full"
                />
              ) : (
                <h1 className="font-headline text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white truncate">
                  {player.name}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Die Chips sind das Positions-Profil — hier stehen sie ohnehin, also
                    bearbeitet man sie auch hier. Eine eigene Karte weiter unten sagte
                    dasselbe zweimal. */}
                {istAdmin ? (
                  <button
                    onClick={() => setPositionsOpen(true)}
                    title="Erste · zweite · dritte Wahl — zum Ändern tippen"
                    aria-label="Positions-Profil bearbeiten"
                    className={`group inline-flex items-center gap-2 rounded-xl -ml-2 pl-2 pr-2.5 py-1.5 cursor-pointer transition-colors border hover:bg-navy-800 ${
                      player.primaryPosition
                        ? 'border-navy-700 hover:border-navy-500'
                        : 'border-dashed border-navy-500 hover:border-cream-200'
                    }`}
                  >
                    {player.primaryPosition
                      ? <PositionBadges player={player} tone="dark" />
                      : (
                        <span className="font-display text-xs font-bold uppercase tracking-wide text-navy-200">
                          Positionen festlegen
                        </span>
                      )}
                    {/* Der Stift muss man erkennen, bevor man ihn braucht: eigene Fläche,
                        heller Rahmen, und beim Überfahren wird er weiß. */}
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-navy-800 text-navy-200 transition-colors group-hover:bg-navy-600 group-hover:text-white">
                      <Pencil size={14} />
                    </span>
                  </button>
                ) : player.primaryPosition && (
                  <div className="inline-flex items-center rounded-xl -ml-2 pl-2 pr-2.5 py-1.5 border border-navy-700">
                    <PositionBadges player={player} tone="dark" />
                  </div>
                )}
                {/* Geschlecht steht neben den Positionen, weil es dieselbe Art Angabe ist:
                    Stammdaten, die die Aufstellung braucht. Fehlt es, sagt der Knopf das —
                    die Frauen-Quote der Liga haengt daran. */}
                {istAdmin && (
                  <button
                    onClick={() => setGenderOpen(true)}
                    aria-label={player.gender ? `Geschlecht: ${GENDER_LABELS[player.gender]} — ändern` : 'Geschlecht festlegen'}
                    title={player.gender
                      ? `${GENDER_LABELS[player.gender]} — Grundlage der Frauen-Quote, zum Ändern tippen`
                      : 'Grundlage der Frauen-Quote — zum Ändern tippen'}
                    className={`font-display text-[10px] font-bold uppercase rounded-lg py-1.5 cursor-pointer transition-colors border ${
                      player.gender
                        ? 'w-7 text-[13px] border-navy-700 text-navy-100 hover:bg-navy-800 hover:border-navy-500'
                        : 'px-2 tracking-widest border-dashed border-navy-500 text-navy-200 hover:border-cream-200 hover:text-cream-100'
                    }`}
                  >
                    {player.gender ? GENDER_SHORT[player.gender] : 'Geschlecht festlegen'}
                  </button>
                )}
                {player.regular && (
                  <span className="font-display text-[10px] font-bold uppercase tracking-widest text-navy-200">
                    Stammspieler
                  </span>
                )}
                {player.archived && (
                  <span className="font-display text-[10px] font-bold uppercase tracking-widest text-navy-300 italic">
                    archiviert
                  </span>
                )}
              </div>
            </div>
            {/* Selten gebrauchte Aktionen hinter den drei Punkten: ein Name wird einmal
                getippt und dann nie wieder, und zwei Stifte nebeneinander zeigen auf
                zwei verschiedene Dinge. Der Stift an den Chips bleibt das Positions-Profil. */}
            {istAdmin && !editingName && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="Weitere Aktionen"
                  aria-expanded={menuOpen}
                  className="p-2 rounded-lg text-navy-300 hover:text-white hover:bg-navy-800 cursor-pointer"
                >
                  <DotsVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-cream-300 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    <MenuItem
                      icon={<Pencil size={14} />}
                      label="Umbenennen"
                      onClick={() => { setMenuOpen(false); setDraftName(player.name); setEditingName(true) }}
                    />
                    {/* Die Quote der Liga braucht die Zuordnung — hier ist sie dort,
                        wo man die Person gerade anschaut. Fuer den ganzen Kader auf
                        einmal gibt es das Sheet im Kader. */}
                    <MenuItem
                      icon={player.archived ? <ArchiveRestoreIcon size={14} /> : <ArchiveIcon size={14} />}
                      label={player.archived ? 'Reaktivieren' : 'Archivieren'}
                      hint={player.archived
                        ? 'Zurück in Lineups, Training und Statistik'
                        : 'Raus aus Lineups und Statistik, Historie bleibt'}
                      onClick={() => { setMenuOpen(false); toggleArchived() }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-4 gap-2 mt-5">
            <Kpi label="AVG" value={rate(totals.hits, totals.atBats)} />
            <Kpi label="OBP" value={rate(totals.timesOnBase, totals.plateAppearances)} />
            <Kpi label="Hits" value={String(totals.hits)} />
            {/* At-Bats, nicht PA: so geht die Kachel auf — 19 Hits aus 48 At-Bats
                sind die .396 daneben. Mit den 62 PA liess sich der Schnitt nicht
                nachrechnen. OBP rechnet weiter je PA, das steht im Glossar. */}
            <Kpi label="At-Bats" value={String(totals.atBats)} />
          </dl>
        </header>

        {/* Eine native Auswahl statt einer Reihe Chips: fünf Saisons plus Jahre passen
            am Handy in keine Zeile, und eine Leiste zum Wischen versteckt die Hälfte
            der Optionen. Gleiche Optik wie die Filter im Spiel-Verlauf. */}
        {(years.length > 1 || seasons.length > 1) && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Zeitraum wählen"
              value={scopeValue(scope)}
              onChange={e => setScope(parseScopeValue(e.target.value, seasons))}
              className={SELECT_PILL_CLASS}
              style={SELECT_PILL_STYLE}
            >
              <option value="all">Alle Spiele</option>
              {years.length > 1 && (
                <optgroup label="Jahr">
                  {years.map(y => <option key={y} value={`year:${y}`}>{y}</option>)}
                </optgroup>
              )}
              {seasons.length > 1 && (
                <optgroup label="Saison">
                  {seasons.map(se => (
                    <option key={se.seasonId} value={`season:${se.seasonId}`}>
                      {years.length > 1 && se.year != null ? `${se.name} ${se.year}` : se.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {scope.kind !== 'all' && (
              <button
                onClick={() => setScope({ kind: 'all' })}
                className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-navy-900 cursor-pointer"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Am Handy ist die DOM-Reihenfolge die Lesereihenfolge: erst die Lage (Form,
            Einsatz, Teamvergleich), dann das Nachschlagen (gespielte Posten, das Spiel-Log,
            die Jahrestabelle). Ab lg laufen dieselben Karten in zwei Spalten weiter; der
            Schnitt liegt so, dass beide ähnlich hoch werden. */}
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <div className="space-y-4">
          <section className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-4 shadow-card">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900 mb-1">
              Form
            </h2>
            <FormChart
              points={points}
              playerName={player.name}
              teammates={teammates}
              compares={compares}
              onComparesChange={setCompareIds}
            />
          </section>

          {usage && (
            <section className={`bg-white border border-cream-300 rounded-2xl px-4 py-4 ${scopeFade}`} aria-busy={scopeLoading}>
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
                Einsatz und Verfügbarkeit
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Wie oft man mit dieser Person planen kann — und wo sie schlägt.
              </p>
              <UsagePanel usage={usage} trainingsOutOfScope={scope.kind === 'season'} />
            </section>
          )}

          <section className={`bg-white border border-cream-300 rounded-2xl px-4 py-4 ${scopeFade}`} aria-busy={scopeLoading}>
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
              Stärken und Schwächen
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              Jede Kennzahl gegen den Rest des Kaders.
            </p>
            <StrengthsPanel playerId={playerId} allTime={battingField} />
          </section>
          </div>

          <div className="space-y-4">
          {/* Die drei Nachschlage-Karten stehen am Ende und starten am Handy zugeklappt:
              Jahrestabelle, Spiel-Log, gespielte Posten. Man geht dort hinein, wenn eine
              der Karten darüber eine Frage aufgeworfen hat. */}
          <CollapsibleCard
            title="Saison für Saison"
            subtitle="Über alle Jahre, unabhängig vom gewählten Zeitraum."
            summary="Jahr für Jahr im Vergleich"
          >
            <SeasonTable points={timeline} />
          </CollapsibleCard>

          <CollapsibleCard
            title="Letzte Spiele"
            subtitle="Was hinter dem letzten Stück der Kurve steckt."
            summary={points.length === 1 ? 'Ein gescortes Spiel im Detail' : `${points.length} gescorte Spiele im Detail`}
          >
            <GameLog points={points} />
          </CollapsibleCard>

          {gameStats && Object.keys(gameStats.positionCounts).length > 0 && (
            <CollapsibleCard
              title="Tatsächlich gespielt"
              subtitle={`${gameStats.totalGames} ${gameStats.totalGames === 1 ? 'Spiel' : 'Spiele'}${scope.kind === 'all' ? ' insgesamt' : ''}`}
              summary={`${Object.keys(gameStats.positionCounts).length} Posten in ${gameStats.totalGames} ${gameStats.totalGames === 1 ? 'Spiel' : 'Spielen'}`}
            >
              {(() => {
                const ranked = Object.entries(gameStats.positionCounts).sort(([, a], [, b]) => b - a)
                const max = ranked[0][1]
                // Vier Zeilen zeigen, wo jemand hingehört; der lange Rest sind
                // Aushilfs-Einsätze und muss nicht jedes Mal mitscrollen.
                const shown = showAllPositions ? ranked : ranked.slice(0, 4)
                return (
                  <>
                    <ul className="space-y-1.5">
                      {shown.map(([position, count]) => (
                        <li key={position} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs text-navy-900">{POSITION_NAMES[position] ?? position}</span>
                          <span className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                            <span
                              className="block h-full bg-bar rounded-full"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </span>
                          <span className="w-8 text-right text-xs font-semibold text-navy-900 tabular-nums">{count}</span>
                        </li>
                      ))}
                    </ul>
                    {ranked.length > 4 && (
                      <button
                        onClick={() => setShowAllPositions(v => !v)}
                        className="mt-2 font-display text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-navy-900 cursor-pointer"
                      >
                        {showAllPositions ? 'Weniger' : `Alle ${ranked.length} zeigen`}
                      </button>
                    )}
                  </>
                )
              })()}
            </CollapsibleCard>
          )}
          </div>
        </div>

        <ResponsiveSheet
          open={genderOpen}
          onClose={() => setGenderOpen(false)}
          title={`Geschlecht — ${player.name}`}
        >
          <GenderSheet players={[player]} onSet={(_, gender) => setGender(gender)} />
        </ResponsiveSheet>

        <PositionProfileSheet
          player={player}
          open={positionsOpen}
          onClose={() => setPositionsOpen(false)}
          onSave={async slots => {
            try {
              await savePositions(slots)
              toast.show('Positionen gespeichert')
            } catch (e: unknown) {
              toast.show((e as Error).message, 'error')
              throw e
            }
          }}
        />
      </div>
    </div>
  )
}

/** Zeile im Kopf-Menü: Icon, Label, dazu ein Satz, was die Aktion tut. */
function MenuItem({ icon, label, hint, onClick }: {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-cream-100 cursor-pointer text-navy-800"
    >
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-gray-500">{hint}</span>}
      </span>
    </button>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums leading-none">{value}</dd>
      {/* Gedämpftes Rot für die kleinen Labels auf Navy — dieselbe Behandlung wie im
          Spiel-Verlauf, damit die beiden Auswertungs-Flächen zusammengehören. */}
      <dt className="font-display text-[10px] font-bold uppercase tracking-widest text-softball-red-300 mt-1">{label}</dt>
    </div>
  )
}

/** Scope → Select-Wert und zurück. Die Saison-Liste liefert Name und Jahr dazu. */
function scopeValue(scope: ProfileScope): string {
  if (scope.kind === 'year') return `year:${scope.year}`
  if (scope.kind === 'season') return `season:${scope.seasonId}`
  return 'all'
}

function parseScopeValue(
  value: string,
  seasons: { seasonId: number; name: string; year: number | null }[],
): ProfileScope {
  if (value.startsWith('year:')) return { kind: 'year', year: Number(value.slice(5)) }
  if (value.startsWith('season:')) {
    const seasonId = Number(value.slice(7))
    const season = seasons.find(s => s.seasonId === seasonId)
    return { kind: 'season', seasonId, name: season?.name ?? '', year: season?.year ?? null }
  }
  return { kind: 'all' }
}

function sum(points: PlayerFormPoint[]) {
  return points.reduce(
    (acc, p) => ({
      plateAppearances: acc.plateAppearances + p.plateAppearances,
      atBats: acc.atBats + p.atBats,
      hits: acc.hits + p.hits,
      timesOnBase: acc.timesOnBase + p.timesOnBase,
    }),
    { plateAppearances: 0, atBats: 0, hits: 0, timesOnBase: 0 },
  )
}

/** Quoten ohne führende Null (.312), leere Nenner als Gedankenstrich. */
function rate(numerator: number, denominator: number): string {
  if (denominator === 0) return '–'
  return (numerator / denominator).toFixed(3).replace(/^0/, '')
}
