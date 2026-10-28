import { Link } from 'react-router-dom'
import { MapPin, Check, ClipboardList } from 'lucide-react'
import type { GameDayResponse } from '@/types'
import { GatedLink } from '@/components/shared/GatedLink'
import { useRolle } from '@/hooks/useRolle'
import { ohneKlickstile } from '@/utils/klickstile'

interface Props {
  gameDay: GameDayResponse
  variant: 'today' | 'upcoming' | 'past'
}

function formatHeroDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase()
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }).toUpperCase()
  return `${day} · ${date}`
}

export function HeroNextGameDay({ gameDay, variant }: Props) {
  const { istAdmin, darfScoren } = useRolle()
  const stripeLabel = variant === 'today' ? 'Heute · Nächster Spieltag' : variant === 'upcoming' ? 'Nächster Spieltag' : 'Letzter Spieltag'
  /*
   * Rot ruft, der vergangene Spieltag nicht — der traegt nur eine Aufschrift. Im
   * Hellen war das navy-700 auf navy-900: eine Stufe heller als der Block darunter.
   * Fest kodiert geht das im Dunkeln schief, wo der Block selbst schon heller ist.
   * Weiss mit Deckung rechnet die Stufe stattdessen aus dem aus, was gerade
   * dahinterliegt — und zeigt in beiden Themes nach oben.
   */
  const stripeBg = variant === 'past' ? 'bg-white/10' : 'bg-softball-red-600'

  /*
   * Erinnerung, kein Schalter: nur am kommenden Spieltag (der Block faellt nach der Saison auf
   * den letzten vergangenen zurueck — den sieht ohnehin jeder), nur der Trainer, nur wenn eine Aufstellung dasteht, nur wenn
   * die Freigabe fehlt oder veraltet ist. Freigegeben wird im Planer, wo man sie auch sieht.
   */
  const hatAufstellung = gameDay.games.some(g => g.lineupEntryCount > 0)
  const freigegeben = gameDay.lineupsReleasedAt != null
  const freigabeText = !freigegeben
    ? 'Aufstellung noch nicht freigegeben'
    : gameDay.lineupsChangedSinceRelease ? 'Seit der Freigabe geändert' : null
  const erinnern = variant !== 'past' && istAdmin && hatAufstellung && freigabeText !== null

  return (
    /*
     * Der Block ist Betonung, nicht Rahmen: `spotlight`, nicht `band`. Mit
     * bg-navy-900 war er im Dunkeln exakt die Seitenfarbe — die Karte hatte
     * keine Raender mehr, der Schatten darunter faellt auf Navy ohnehin aus.
     * Die Fuellung sitzt aussen, damit die Aufschrift oben sich gegen sie
     * aufhellen kann statt gegen die Seite.
     */
    <div className="rounded-2xl overflow-hidden bg-spotlight text-spotlight-ink shadow-lg shadow-navy-900/15">
      <div className={`${stripeBg} px-4 py-1.5 flex items-center gap-2 font-display text-[11px] font-bold tracking-widest uppercase`}>
        {variant === 'today' && (
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        )}
        {stripeLabel}
      </div>
      <div className="px-3.5 py-2.5 sm:px-5 sm:py-4 md:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="font-display font-extrabold text-lg sm:text-2xl md:text-3xl tracking-wide leading-none">
            {formatHeroDate(gameDay.date)}
          </div>
          {gameDay.location && (
            <div className="text-[10px] sm:text-xs text-white/65 truncate inline-flex items-center gap-1 shrink-0">
              <MapPin size={11} className="shrink-0" /> {gameDay.location}
            </div>
          )}
        </div>
        {gameDay.games.length > 0 && (
          <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
            {gameDay.games.map((g, i) => {
              const displayNum = i + 1
              const routeIdx = i  // 0-based array index — ScoringPage uses gameDay.games[gameIndex]
              // FERTIG: Backend `endedAt` ist die Wahrheit. Cross-Device-konsistent.
              // Score-Presence (auch 0–0) zählt NICHT als Ende — Spiel kann mid-game 0–0 sein.
              const finished = g.endedAt != null
              // LIVE: nicht fertig + atBats > 0 (Backend-Flag)
              const isLive = !finished && (g.atBatCount ?? 0) > 0
              const hasScore = g.scoreUs != null && g.scoreThem != null
              const result: 'W' | 'L' | 'T' | null = !finished || !hasScore
                ? null
                : (g.scoreUs ?? 0) > (g.scoreThem ?? 0) ? 'W'
                : (g.scoreUs ?? 0) < (g.scoreThem ?? 0) ? 'L' : 'T'
              // Die Zeile hebt sich nur an, wenn die GANZE Zeile klickbar ist. Ein Scorer ohne Admin-Recht
              // hat nur die Scoring-Fläche rechts als Link — die trägt ihren eigenen Hover.
              const klickbar = istAdmin
              const rohCls = finished
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : isLive
                ? 'bg-softball-red-600/20 border-softball-red-400/40 hover:bg-softball-red-600/30'
                : 'bg-white/8 border-white/15 hover:bg-white/15'
              const cls = klickbar ? rohCls : ohneKlickstile(rohCls)
              /*
               * Hebt die ganze Zeile schon an, hebt der Ausschnitt darin NICHT noch einmal.
               * Sonst liegen vier weisse Schleier uebereinander (Zeile, Zeilen-Hover,
               * Link-Hover, Abzeichen): im Hellen stapeln die sich auf navy-900 und bleiben
               * dunkel, im Dunkeln starten sie auf dem helleren Block und klettern aus dem
               * Lesbaren — weisse Schrift landete bei 3,9:1. Zwei verschiedene Helligkeiten
               * innerhalb einer Zeile, die als Ganzes klickbar ist, waeren ohnehin eine
               * Auskunft ueber nichts. */
              const teilHover = klickbar ? '' : ' hover:bg-white/10'
              // Im Dunkeln ist der Block selbst heller — weisse Tinte mit Deckung verliert
              // hier den Spielraum, den sie auf dem hellen Theme noch hatte (3,7:1 statt 4,5).
              /*
               * Das offene Spiel traegt eine Kontur, keine Fuellung. Vorher war es ein
               * vierter weisser Schleier (Block, Zeile, Zeilen-Hover, Abzeichen) — unter dem
               * Zeiger blieben davon 4,3:1 fuer weisse Schrift. Ein Rahmen nimmt dem Stapel
               * eine Stufe und sagt nebenbei, was gemeint ist: gespielt ist gefuellt, offen
               * ist umrandet. Dasselbe Paar wie bei der Pille rechts.
               */
              const numCls = finished
                ? 'bg-white/10 text-white/75'
                : isLive
                ? 'bg-softball-red-500 text-white'
                : 'border border-white/35 text-white'
              return (
                <div
                  key={g.id}
                  className={`flex items-stretch gap-1 rounded-lg border transition-colors ${cls}`}
                >
                  <GatedLink
                    erlaubt={istAdmin}
                    to={`/gameday/${gameDay.id}?game=${routeIdx}`}
                    className={`flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-l-lg${teilHover}`}
                    aria-label={`Lineup für Spiel ${displayNum}`}
                  >
                    <span className={`font-display w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center shrink-0 ${numCls}`}>
                      {displayNum}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-display font-bold text-[12px] sm:text-[13px] tracking-wide uppercase truncate ${finished ? 'text-white/70' : 'text-white'}`}>
                        {g.opponentTeam?.name ?? 'Gegner offen'}
                      </div>
                      {(g.scoreUs != null || g.scoreThem != null) && (
                        <div className="text-[9.5px] sm:text-[10px] text-white/55 leading-tight">
                          {finished ? 'Endstand' : 'Stand'} {g.scoreUs ?? 0}–{g.scoreThem ?? 0}
                        </div>
                      )}
                    </div>
                  </GatedLink>
                  <GatedLink
                    erlaubt={darfScoren}
                    to={`/gameday/${gameDay.id}/scoring/${routeIdx}`}
                    className={`shrink-0 flex items-center min-h-11 px-1.5 rounded-md${teilHover}`}
                    aria-label={`${finished ? 'Stats' : 'Live-Scoring'} für Spiel ${displayNum}`}
                  >
                    {finished ? (
                      <span className={`font-display text-[10px] font-extrabold tracking-widest uppercase inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                        result === 'W' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : result === 'L' ? 'bg-softball-red-500/20 text-softball-red-100 border border-softball-red-400/40'
                        : 'bg-cream-50 text-navy-900 border border-cream-200'
                      }`}>
                        <Check size={10} strokeWidth={3} /> {result === 'W' ? 'Sieg' : result === 'L' ? 'Niederlage' : 'Fertig'}
                      </span>
                    ) : isLive ? (
                      <span className="font-display text-[10px] font-extrabold tracking-widest uppercase inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-softball-red-600 text-white border border-softball-red-400/60">
                        <span className="relative flex w-1.5 h-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        Live
                      </span>
                    ) : (
                      <span className="font-display text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-white border border-white/15">
                        Offen
                      </span>
                    )}
                  </GatedLink>
                </div>
              )
            })}
          </div>
        )}
        {erinnern && (
          <Link
            to={`/gameday/${gameDay.id}`}
            className="mt-2 sm:mt-3 flex items-center gap-2 text-[12px] sm:text-sm text-white/85 hover:text-white transition-colors"
          >
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full inline-block bg-amber-400 shrink-0" />
            {freigabeText}
          </Link>
        )}
        {istAdmin && (
          <Link
            to={`/gameday/${gameDay.id}`}
            className="font-display mt-2 sm:mt-3 w-full h-9 sm:h-10 rounded-lg bg-invers hover:bg-invers/90 text-invers-ink font-extrabold text-[11px] sm:text-xs tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors"
          >
            <ClipboardList size={13} /> Lineup verwalten
          </Link>
        )}
      </div>
    </div>
  )
}
