import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared'

export type ScopeKind = 'season' | 'year' | 'allTime' | 'gameDay' | 'game' | 'opponent'

export interface ZeitraumOption { value: string | number; label: string }

interface Props {
  scopeKind: ScopeKind
  /** Text des Knopfes: der geltende Zustand, z.B. „Jahr 2101". */
  label: string
  onScope: (kind: ScopeKind) => void
  gameDays: ZeitraumOption[]
  seasons: ZeitraumOption[]
  years: ZeitraumOption[]
  opponents: ZeitraumOption[]
  /** Spiele gegen den gewählten Gegner; leer, wenn keiner gewählt ist. */
  opponentGames: ZeitraumOption[]
  selected: { gameDay: number | null; season: number | null; year: number; opponent: string | null; opponentGame: number | null }
  onGameDay: (id: number) => void
  onSeason: (id: number) => void
  onYear: (year: number) => void
  onOpponent: (name: string) => void
  onOpponentGame: (id: number | null) => void
}

const SCOPES: { kind: ScopeKind; label: string }[] = [
  { kind: 'gameDay', label: 'Spieltag' },
  { kind: 'season', label: 'Saison' },
  { kind: 'year', label: 'Jahr' },
  { kind: 'opponent', label: 'Nach Gegner' },
  { kind: 'allTime', label: 'Alle Zeit' },
]

const CHOICE = 'font-display w-full min-h-11 px-4 text-left text-sm font-bold tracking-wide cursor-pointer transition-[color,background-color,transform] active:scale-[0.97]'

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${CHOICE} ${active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-cream-200'}`}
    >
      {children}
    </button>
  )
}

/**
 * Der Zeitraum von /stats als ein Knopf. Er trägt den geltenden Zustand als Text und öffnet
 * ein Blatt: oben die Art des Zeitraums, darunter dessen Wert. „Dieses Spiel" kommt aus der
 * URL und wird nicht gewählt — es erscheint nur, solange es gilt.
 */
export function ZeitraumKnopf(p: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const pick = (fn: () => void) => () => { fn(); close() }

  return (
    <>
      <button
        type="button"
        data-testid="zeitraum-knopf"
        onClick={() => setOpen(true)}
        className="font-display inline-flex items-center gap-2 min-h-11 px-4 max-w-full text-xs font-bold tracking-widest uppercase rounded-full bg-navy-900 text-white cursor-pointer transition-[background-color,transform] active:scale-[0.97] hover:bg-navy-800"
      >
        <span className="truncate">{p.label}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      <ResponsiveSheet open={open} onClose={close} title="Zeitraum">
        <div className="py-2">
          {p.scopeKind === 'game' && <Choice active onClick={() => { /* kommt aus der URL */ }}>Dieses Spiel</Choice>}
          {SCOPES.map(s => (
            <Choice
              key={s.kind}
              active={p.scopeKind === s.kind}
              onClick={() => { p.onScope(s.kind); if (s.kind === 'allTime') close() }}
            >
              {s.label}
            </Choice>
          ))}
        </div>

        {p.scopeKind === 'gameDay' && p.gameDays.length > 0 && (
          <Values>
            {p.gameDays.map(o => (
              <Choice key={o.value} active={o.value === p.selected.gameDay} onClick={pick(() => p.onGameDay(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Values>
        )}
        {p.scopeKind === 'season' && p.seasons.length > 0 && (
          <Values>
            {p.seasons.map(o => (
              <Choice key={o.value} active={o.value === p.selected.season} onClick={pick(() => p.onSeason(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Values>
        )}
        {p.scopeKind === 'year' && p.years.length > 0 && (
          <Values>
            {p.years.map(o => (
              <Choice key={o.value} active={o.value === p.selected.year} onClick={pick(() => p.onYear(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Values>
        )}
        {p.scopeKind === 'opponent' && p.opponents.length > 0 && (
          <Values>
            {p.opponents.map(o => (
              <Choice key={o.value} active={o.value === p.selected.opponent} onClick={() => p.onOpponent(String(o.value))}>{o.label}</Choice>
            ))}
          </Values>
        )}
        {p.scopeKind === 'opponent' && p.opponentGames.length > 0 && (
          <Values>
            <Choice active={p.selected.opponentGame == null} onClick={pick(() => p.onOpponentGame(null))}>
              Alle Spiele ({p.opponentGames.length})
            </Choice>
            {p.opponentGames.map(o => (
              <Choice key={o.value} active={o.value === p.selected.opponentGame} onClick={pick(() => p.onOpponentGame(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Values>
        )}
      </ResponsiveSheet>
    </>
  )
}

function Values({ children }: { children: React.ReactNode }) {
  return <div className="py-2 border-t border-cream-300">{children}</div>
}
