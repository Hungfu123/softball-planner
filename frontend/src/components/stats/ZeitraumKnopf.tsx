import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared'
import { SCOPES, THIS_GAME_LABEL, type ScopeKind } from './statsScope'

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

const CHOICE = 'font-display w-full min-h-11 px-4 text-left text-sm font-bold tracking-wide cursor-pointer transition-[color,background-color,transform] active:scale-[0.97]'

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`${CHOICE} ${active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-cream-200'}`}
    >
      {children}
    </button>
  )
}

function Group({ label, divided, children }: { label: string; divided?: boolean; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className={divided ? 'py-2 border-t border-cream-300' : 'py-2'}>
      {children}
    </div>
  )
}

/**
 * Der Zeitraum von /stats als ein Knopf. Er trägt den geltenden Zustand als Text und öffnet
 * ein Blatt: oben die Art des Zeitraums, darunter dessen Wert. „Dieses Spiel" kommt aus der
 * URL und wird nicht gewählt — es erscheint nur, solange es gilt, als Zeile ohne Wirkung.
 * „Fertig" schließt das Blatt in jedem Zustand; die Wahl eines Werts schließt es als Abkürzung.
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
        className="font-display inline-flex items-center gap-2 min-h-11 px-4 max-w-full text-sm font-bold rounded-full bg-navy-900 text-white cursor-pointer transition-[background-color,transform] active:scale-[0.97] hover:bg-navy-800"
      >
        <span className="truncate">{p.label}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      <ResponsiveSheet
        open={open}
        onClose={close}
        title="Zeitraum"
        footer={
          <button
            type="button"
            onClick={close}
            className="font-display w-full min-h-11 text-sm font-bold tracking-widest uppercase rounded-full bg-navy-900 text-white cursor-pointer transition-[background-color,transform] active:scale-[0.97] hover:bg-navy-800"
          >
            Fertig
          </button>
        }
      >
        {p.scopeKind === 'game' && (
          <p className="font-display min-h-11 px-4 flex items-center text-sm font-bold text-gray-500 border-b border-cream-300">
            {THIS_GAME_LABEL}
          </p>
        )}
        <Group label="Zeitraum">
          {SCOPES.map(s => (
            <Choice
              key={s.kind}
              active={p.scopeKind === s.kind}
              onClick={() => { p.onScope(s.kind); if (s.kind === 'allTime') close() }}
            >
              {s.label}
            </Choice>
          ))}
        </Group>

        {p.scopeKind === 'gameDay' && p.gameDays.length > 0 && (
          <Group label="Spieltag" divided>
            {p.gameDays.map(o => (
              <Choice key={o.value} active={o.value === p.selected.gameDay} onClick={pick(() => p.onGameDay(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Group>
        )}
        {p.scopeKind === 'season' && p.seasons.length > 0 && (
          <Group label="Saison" divided>
            {p.seasons.map(o => (
              <Choice key={o.value} active={o.value === p.selected.season} onClick={pick(() => p.onSeason(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Group>
        )}
        {p.scopeKind === 'year' && p.years.length > 0 && (
          <Group label="Jahr" divided>
            {p.years.map(o => (
              <Choice key={o.value} active={o.value === p.selected.year} onClick={pick(() => p.onYear(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Group>
        )}
        {p.scopeKind === 'opponent' && p.opponents.length > 0 && (
          <Group label="Gegner" divided>
            {p.opponents.map(o => (
              <Choice key={o.value} active={o.value === p.selected.opponent} onClick={() => p.onOpponent(String(o.value))}>{o.label}</Choice>
            ))}
          </Group>
        )}
        {p.scopeKind === 'opponent' && p.opponentGames.length > 0 && (
          <Group label="Spiel gegen den Gegner" divided>
            <Choice active={p.selected.opponentGame == null} onClick={pick(() => p.onOpponentGame(null))}>
              Alle Spiele ({p.opponentGames.length})
            </Choice>
            {p.opponentGames.map(o => (
              <Choice key={o.value} active={o.value === p.selected.opponentGame} onClick={pick(() => p.onOpponentGame(Number(o.value)))}>{o.label}</Choice>
            ))}
          </Group>
        )}
      </ResponsiveSheet>
    </>
  )
}
