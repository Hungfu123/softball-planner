import { useMemo, useState, useEffect } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { BaseStateDto, RunnerOnBase } from '@/types'

type Position = 1 | 2 | 3 | 'home' | 'out'

interface RunnerAssignment {
  playerId: number
  playerName: string
  position: Position
  wasOnBase: 1 | 2 | 3 | null  // wo war er VORHER
  /** Pre-AB Reihenfolge-Rang. 0 = kam vom Home (Batter), 1/2/3 = war auf Base,
   *  4 = war bereits gescort. Fuer Overtake-Validierung: kein Runner darf vor
   *  einem laufen der pre-AB weiter vorne war. */
  preRank: number
}

/**
 * Context: 'manual' — User hat "Korrigieren"-Button gedrückt, generische Runner-Anpassung
 *          'post-out' — Automatisch nach Out-Play geöffnet, zeigt Grounder/Fly-kontextuelle Texte.
 *                       onSave interpretiert outsFromRunners als OUT_ON_PLAY statt CAUGHT_STEALING.
 */
export type CorrectionContext = 'manual' | 'post-out'

interface Props {
  open: boolean
  onClose: () => void
  baseState?: BaseStateDto  // optional, reserviert für künftige Nutzung
  runners: RunnerOnBase[]
  /** Runner-Positionen VOR dem letzten AB. Wenn Runner durch Auto-Advance
   *  weitergerückt wurde (z.B. 2B→3B bei Single), enthält dies seine
   *  Original-Base. Cycle-Range startet ab dort → User kann zurück tappen. */
  preAbRunners?: RunnerOnBase[]
  /** Batter ID des AB der dieses Sheet ausgeloest hat. Markiert ihn als
   *  "kam vom Home" fuer Overtake-Validierung — er darf nicht hoeher landen
   *  als Pre-Runner die vor ihm waren. */
  justBattedId?: number | null
  recentlyScored?: { playerId: number; playerName: string }[]
  context?: CorrectionContext
  /** Outs im aktuellen Inning NACH dem Abschluss dieses AtBats (0/1/2/3). Bei 3 → Force-Out-Regel-Hinweis. */
  outsAfter?: number
  /** Batter der durch dieses AB auf eine Base kommt (z.B. ROE → defaultBase=1).
   *  Wird als Assignment hinzugefügt, damit User Position via Tap-Cycle anpassen kann. */
  extraBatter?: { playerId: number; playerName: string; defaultBase: 1 | 2 | 3 }
  onSave: (data: {
    newState: BaseStateDto
    extraRuns: number
    outsFromRunners: number[]
    unscoredPlayerIds: number[]  // Spieler die VORHER 'home' waren, jetzt nicht mehr → Runs abziehen
    context: CorrectionContext
  }) => void | Promise<void>
}

export function CorrectionSheet({ open, onClose, runners, preAbRunners = [], justBattedId = null, recentlyScored = [], context = 'manual', outsAfter, extraBatter, onSave }: Props) {
  const [assignments, setAssignments] = useState<RunnerAssignment[]>([])
  const [saving, setSaving] = useState(false)

  // Initialisiere Runner-Assignments nur beim Öffnen — vermeidet Loop wenn
  // Parent neue Array-Referenz für `runners`-Prop bei jedem Render erzeugt.
  // Sheet zeigt die Assignments im Moment des Öffnens, danach lokale Edits.
  useEffect(() => {
    if (!open) return
    // Bei post-out: Auto-Default = +1 Base (Force-Out-Standard).
    //   1B → 2B, 2B → 3B, 3B → Home. User fixt wenn Runner doch out oder bleibt.
    // Bei manual: Default = bleibt (User passt nur an was geändert hat).
    const advanceByOne = (b: 1 | 2 | 3): Position => (b === 3 ? 'home' : ((b + 1) as Position))
    const preBaseMap = new Map(preAbRunners.map(r => [r.playerId, r.base as 1 | 2 | 3]))
    const onBase = runners.map(r => {
      // wasOnBase = Pre-AB Base wenn bekannt (= Original-Position vor Auto-Advance).
      // Erlaubt Cycle bis zurueck zur Ausgangs-Base.
      const preBase = preBaseMap.get(r.playerId)
      const currentBase = r.base as 1 | 2 | 3
      const isJustBatted = justBattedId != null && r.playerId === justBattedId
      // wasOnBase = currentBase (Cycle ab dort vorwaerts inkl. Home — auch fuer
      // Batter, damit Park-in-the-Home moeglich ist). preRank merkt sich dass
      // Batter pre-AB vom Home kam (Overtake-Validierung).
      const wasOnBase = preBase != null && preBase <= currentBase ? preBase : currentBase
      const preRank = isJustBatted ? 0 : (preBase ?? currentBase)
      return {
        playerId: r.playerId,
        playerName: r.playerName,
        position: context === 'post-out' ? advanceByOne(currentBase) : currentBase,
        wasOnBase,
        preRank,
      } as RunnerAssignment
    })
    // Scored Runner: wasOnBase = Pre-AB Base (falls bekannt) statt null.
    // Erlaubt Cycle home → preBase → ... → home (User kann gescortn Runner
    // doch auf Base zurueckschicken, z.B. nach Double-Default).
    const scored = recentlyScored.map(s => {
      const preBase = preBaseMap.get(s.playerId) ?? null
      const isJustBatted = justBattedId != null && s.playerId === justBattedId
      return {
        playerId: s.playerId,
        playerName: s.playerName,
        position: 'home' as Position,
        wasOnBase: preBase,
        preRank: isJustBatted ? 0 : (preBase ?? 4),
      } as RunnerAssignment
    })
    // Batter (z.B. ROE): Default auf defaultBase, wasOnBase=defaultBase damit Cycle ab dort
    const batter: RunnerAssignment[] = extraBatter ? [{
      playerId: extraBatter.playerId,
      playerName: extraBatter.playerName,
      position: extraBatter.defaultBase as Position,
      wasOnBase: extraBatter.defaultBase,
      preRank: 0,  // Batter kommt vom Home
    }] : []
    setAssignments([...onBase, ...scored, ...batter])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setPosition = (playerId: number, pos: Position) => {
    setAssignments(arr => arr.map(a => a.playerId === playerId ? { ...a, position: pos } : a))
  }

  const removeAssignment = (playerId: number) => {
    setAssignments(arr => arr.filter(a => a.playerId !== playerId))
  }


  // Build new base state
  // Conflict-Resolution: (1) keine zwei Runner auf gleicher Base, (2) kein
  // Overtaking — Runner darf nicht hoeher landen als ein Pre-Runner der vor
  // ihm war (z.B. Batter pre-rank 0 darf nicht auf 3B wenn Pre-2B-Runner auf
  // 2B bleibt). Out wird ignoriert (Out darf jeden ueberholen / ueberholt werden).
  const postRank = (p: Position): number =>
    p === 'home' ? 4 : (typeof p === 'number' ? p : -1)
  const overtakeViolation = useMemo<{ ahead: string; behind: string } | null>(() => {
    const active = assignments.filter(a => a.position !== 'out')
    for (const A of active) {
      for (const B of active) {
        if (A.playerId === B.playerId) continue
        if (A.preRank < B.preRank && postRank(A.position) > postRank(B.position)) {
          // A war hinten, ueberholt B
          return { ahead: B.playerName, behind: A.playerName }
        }
      }
    }
    return null
  }, [assignments])
  const hasConflict = useMemo(() => {
    const bases = assignments.filter(a => a.position === 1 || a.position === 2 || a.position === 3)
    const first = bases.filter(a => a.position === 1).length
    const second = bases.filter(a => a.position === 2).length
    const third = bases.filter(a => a.position === 3).length
    return first > 1 || second > 1 || third > 1 || overtakeViolation != null
  }, [assignments, overtakeViolation])

  const handleSave = async () => {
    if (hasConflict) return
    const newState: BaseStateDto = {
      first: assignments.find(a => a.position === 1)?.playerId ?? null,
      second: assignments.find(a => a.position === 2)?.playerId ?? null,
      third: assignments.find(a => a.position === 3)?.playerId ?? null,
    }
    // NEU home: Spieler die vorher NICHT 'home' waren, jetzt schon → +Run
    // UnScored: Spieler die vorher 'home' waren (recentlyScored), jetzt nicht → -Run
    const recentlyScoredIds = new Set(recentlyScored.map(r => r.playerId))
    const newHomeAssignments = assignments.filter(a => a.position === 'home' && !recentlyScoredIds.has(a.playerId))
    const extraRuns = newHomeAssignments.length
    const unscoredPlayerIds = recentlyScored
      .filter(rs => {
        const a = assignments.find(a => a.playerId === rs.playerId)
        return a && a.position !== 'home'
      })
      .map(rs => rs.playerId)
    const outsFromRunners = assignments
      .filter(a => a.position === 'out')
      .map(a => a.playerId)
    // Sheet sofort schließen (optimistic). Toast kommt vom Parent-Handler.
    onClose()
    setSaving(true)
    try {
      await onSave({ newState, extraRuns, outsFromRunners, unscoredPlayerIds, context })
    } finally {
      setSaving(false)
    }
  }

  const title = context === 'post-out' ? 'Runner weitergelaufen?' : 'Runner anpassen'
  const subtitle = context === 'post-out'
    ? 'Bei Grounder/Fly: wohin sind die Runner gelaufen?'
    : 'Wo sind die Runner wirklich gelandet? Chips tippen.'

  const footer = (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Vorschau: {baseStateSummary(
          {
            first: assignments.find(a => a.position === 1)?.playerId ?? null,
            second: assignments.find(a => a.position === 2)?.playerId ?? null,
            third: assignments.find(a => a.position === 3)?.playerId ?? null,
          },
          assignments
        )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onClose}
          className="h-11 rounded-lg border border-cream-300 text-gray-700 font-medium cursor-pointer hover:bg-cream-100"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving || hasConflict}
          className="h-11 rounded-lg bg-softball-red-600 text-white font-bold cursor-pointer hover:bg-softball-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Speichern…' : '✓ Passt'}
        </button>
      </div>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={title} maxWidth="md" footer={footer}>
      <div className="px-4 pt-3 pb-4 space-y-4">
        <p className="text-[11px] text-gray-500">{subtitle}</p>

        {/* 3rd-Out Force-Play Warnung — Softball-Regel:
                Wenn 3. Out via Force-Out fällt, zählt KEIN Run der davor erzielt
                wurde (Inning endet bevor Run gewertet wird). Bei manueller
                Korrektur "3B → Home" muss User wissen ob Force-Play vorlag. */}
        {outsAfter === 3 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <span className="text-amber-700 text-base leading-none mt-0.5" aria-hidden>⚠</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">3. Out im Inning</div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Bei <strong>Force-Out</strong> als 3. Out zählt der Run NICHT (Softball-Regel) — auch wenn Runner Home gekreuzt hat.
                Nur Tag-Out / Fly-Out: Run zählt wenn Runner vor Out gescort hat.
              </div>
            </div>
          </div>
        )}

        {assignments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Kein Runner auf Base.</p>
        )}

        {assignments.length > 0 && (
          <p className="text-[11px] text-gray-500 italic px-1 mb-2">
            Tipp auf Pille = nächste Base · Tipp erneut für weitere
          </p>
        )}

        <div className="space-y-1.5">
          {assignments.map(a => (
            <RunnerCard
              key={a.playerId}
              assignment={a}
              onCycle={() => setPosition(a.playerId, nextCyclePosition(a))}
              onToggleOut={() => setPosition(a.playerId, a.position === 'out' ? (a.wasOnBase ?? 'home') : 'out')}
              onToggleHome={() => setPosition(a.playerId, a.position === 'home' ? (a.wasOnBase ?? 'home') : 'home')}
              onRemove={() => removeAssignment(a.playerId)}
            />
          ))}
        </div>

        {hasConflict && (
          <div className="text-xs text-softball-red-700 bg-softball-red-50 border border-softball-red-200 rounded-lg p-2 space-y-0.5">
            {overtakeViolation ? (
              <>
                <div className="font-bold">
                  {overtakeViolation.behind} ueberholt {overtakeViolation.ahead}.
                </div>
                <div className="text-softball-red-600">
                  Runner kann nicht hoeher landen als ein vor ihm laufender. Entweder {overtakeViolation.ahead} mit advancen oder {overtakeViolation.behind} auf gleiche/niedrigere Base.
                </div>
              </>
            ) : (
              <>
                <div className="font-bold">Zwei Runner auf derselben Base.</div>
                <div className="text-softball-red-600">Jede Base kann nur einen Runner halten — einen weiter advancen.</div>
              </>
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  )
}

function baseStateSummary(state: BaseStateDto, assignments: RunnerAssignment[]): string {
  const parts: string[] = []
  if (state.first) {
    const a = assignments.find(x => x.playerId === state.first)
    if (a) parts.push(`1B: ${a.playerName}`)
  }
  if (state.second) {
    const a = assignments.find(x => x.playerId === state.second)
    if (a) parts.push(`2B: ${a.playerName}`)
  }
  if (state.third) {
    const a = assignments.find(x => x.playerId === state.third)
    if (a) parts.push(`3B: ${a.playerName}`)
  }
  const home = assignments.filter(a => a.position === 'home').length
  const outs = assignments.filter(a => a.position === 'out').length
  if (home > 0) parts.push(`${home} scort`)
  if (outs > 0) parts.push(`${outs} Aus`)
  if (parts.length === 0) return 'Bases leer'
  return parts.join(' · ')
}

/**
 * Cycle: bleibt → +1 Base → +2 Bases → Home → bleibt.
 * Range basiert auf Start-Base (1B-Runner: 1→2→3→Home; 2B: 2→3→Home; 3B: 3→Home).
 * Kein Rückwärts-Cycle (Runner kann nicht zu vorheriger Base laufen).
 */
function nextCyclePosition(a: RunnerAssignment): Position {
  const from = a.wasOnBase ?? 'home'
  if (from === 'home') {
    // Recently-scored Runner — Toggle zwischen home ↔ ausgangs-base unmöglich, daher Cycle ist No-op.
    // Hat eigene UI in RunnerCard (Home-Toggle).
    return a.position
  }
  // Cycle steps abhängig vom Start
  const steps: Position[] = []
  for (let b = from; b <= 3; b++) steps.push(b as Position)
  steps.push('home')
  // Wenn aktuell out: zurück zur Start-Base
  if (a.position === 'out') return from
  const idx = steps.indexOf(a.position)
  if (idx === -1) return from
  return steps[(idx + 1) % steps.length]
}

function cycleLabel(a: RunnerAssignment): string {
  if (a.position === 'out') {
    // Cycle-Button ist disabled wenn Aus aktiv — Label zeigt Original-Position als Kontext.
    if (a.wasOnBase != null) return `bleibt ${a.wasOnBase}B`
    return 'Home'
  }
  if (a.position === 'home') return '→ Home (Run!)'
  if (a.wasOnBase != null && a.position === a.wasOnBase) return `bleibt ${a.wasOnBase}B`
  if (typeof a.position === 'number') return `→ ${a.position}B`
  return 'bleibt'
}

function cycleColor(a: RunnerAssignment): string {
  if (a.position === 'out') return 'bg-softball-red-50 border-softball-red-300 text-softball-red-800'
  if (a.position === 'home') return 'bg-softball-red-600 border-softball-red-700 text-white'
  if (a.wasOnBase != null && a.position !== a.wasOnBase) {
    // Soft emerald — harmoniert mit cream/navy-Palette, nicht zu mint-aqua.
    return 'bg-emerald-50 border-emerald-300 text-emerald-800'
  }
  return 'bg-cream-50 border-cream-300 text-gray-700'
}

interface RunnerCardProps {
  assignment: RunnerAssignment
  onCycle: () => void
  onToggleOut: () => void
  onToggleHome: () => void
  onRemove: () => void
}

function RunnerCard({ assignment: a, onCycle, onToggleOut, onToggleHome, onRemove }: RunnerCardProps) {
  const fromHome = a.wasOnBase == null
  return (
    <div className="border border-cream-300 rounded-lg px-2 py-1.5 bg-cream-100 flex items-center gap-2">
      <div className="min-w-0 flex-shrink-0 w-20">
        <div className="text-sm font-bold text-gray-900 truncate leading-tight">{a.playerName}</div>
        <div className="text-[10px] text-gray-500 leading-tight">
          {fromHome ? 'war Home' : `war ${a.wasOnBase}B`}
        </div>
      </div>
      {fromHome ? (
        <button
          onClick={onToggleHome}
          className={`flex-1 px-2 py-2 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
            a.position === 'home'
              ? 'bg-softball-red-600 border-softball-red-700 text-white'
              : 'bg-cream-50 border-cream-300 text-gray-700 hover:bg-cream-200'
          }`}
        >
          {a.position === 'home' ? '✓ Home (Run!)' : '✕ doch nicht gescort'}
        </button>
      ) : (
        <button
          onClick={onCycle}
          disabled={a.position === 'out'}
          className={`flex-1 px-2 py-2 rounded-md border text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cycleColor(a)}`}
        >
          {cycleLabel(a)}
        </button>
      )}
      <button
        onClick={onToggleOut}
        className={`px-2 py-2 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
          a.position === 'out'
            ? 'bg-softball-red-600 border-softball-red-700 text-white'
            : 'bg-white border-softball-red-200 text-softball-red-700 hover:bg-softball-red-50'
        }`}
        title={a.position === 'out' ? 'Wieder auf Base' : 'Als Out markieren'}
      >
        {a.position === 'out' ? '✕ Aus' : 'Aus?'}
      </button>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-gray-600 text-xs leading-none px-1"
        title="Eintrag entfernen"
      >
        ✕
      </button>
    </div>
  )
}
