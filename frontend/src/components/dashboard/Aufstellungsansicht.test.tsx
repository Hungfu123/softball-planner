import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type {
  BaseCoachAuskunft, GameDayLineupsResponse, GameDayResponse, GameStaffResponse,
  LineupEntryResponse, Player,
} from '@/types'
import { NOCH_KEINE_AUFSTELLUNG, NOCH_NICHT_FREIGEGEBEN } from '@/utils/aufstellungsLage'
import { Aufstellungsansicht } from './Aufstellungsansicht'

const ICH: Player = { id: 7, name: 'Mia Meier', regular: true, defaultBattingOrder: null }
const ANDERE: Player = { id: 8, name: 'Tom Test', regular: true, defaultBattingOrder: null }
const DRITTER: Player = { id: 9, name: 'Uli Unter', regular: true, defaultBattingOrder: null }
const BANK: Player = { id: 10, name: 'Bea Bank', regular: true, defaultBattingOrder: null }

const SPIEL_1 = 10
const SPIEL_2 = 11

function spieltag(extra: Partial<GameDayResponse> = {}): GameDayResponse {
  return {
    id: 1, date: '2099-06-20', label: 'Spieltag', location: 'Sportplatz Nord', seasonId: 1,
    aufstellungsLage: 'FREIGEGEBEN', availablePlayers: [],
    games: [
      {
        id: SPIEL_1, gameNumber: 1, opponentTeam: { id: 1, name: 'Fireballs', ownTeam: false },
        scoreUs: null, scoreThem: null, gameDayId: 1, lineupEntryCount: 2,
      },
      {
        id: SPIEL_2, gameNumber: 2, opponentTeam: { id: 2, name: 'Köln Kings', ownTeam: false },
        scoreUs: null, scoreThem: null, gameDayId: 1, lineupEntryCount: 1,
      },
    ],
    ...extra,
  }
}

function eintrag(player: Player, position: string | null, battingOrder: number, dh: Player | null = null): LineupEntryResponse {
  return { id: battingOrder, player, position, battingOrder, dhBatterPlayer: dh }
}

const OHNE_COACHES: BaseCoachAuskunft = { firstBase: null, thirdBase: null, startSlots: [] }

/** Wie das Backend antwortet: `lineups`/`staff` lassen leere Spiele ganz weg, `baseCoaches` nie. */
function antwort(
  lineups: Record<number, LineupEntryResponse[]>,
  staff: Record<number, GameStaffResponse[]> = {},
  baseCoaches: Record<number, BaseCoachAuskunft> = {},
): GameDayLineupsResponse {
  return {
    lineups: Object.fromEntries(Object.entries(lineups)),
    staff: Object.fromEntries(Object.entries(staff)),
    substitutions: {},
    baseCoaches: {
      [SPIEL_1]: baseCoaches[SPIEL_1] ?? OHNE_COACHES,
      [SPIEL_2]: baseCoaches[SPIEL_2] ?? OHNE_COACHES,
    },
  }
}

const VOLL = antwort(
  { [SPIEL_1]: [eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2)] },
  { [SPIEL_1]: [{ id: 1, player: DRITTER, role: 'BASE_COACH_1ST' }] },
  { [SPIEL_1]: { firstBase: 'Uli Unter', thirdBase: null, startSlots: [3] } },
)

function zeigen(daten: GameDayLineupsResponse | null | undefined, extra: {
  gameDay?: GameDayResponse
  zusagen?: Player[] | null
  playerId?: number | null
} = {}) {
  return render(
    <Aufstellungsansicht
      spieltag={extra.gameDay ?? spieltag()}
      daten={daten}
      zusagen={extra.zusagen === undefined ? [ICH, ANDERE, DRITTER, BANK] : extra.zusagen}
      playerId={extra.playerId === undefined ? ICH.id : extra.playerId}
    />,
  )
}

describe('Aufstellungsansicht', () => {
  it('zeigt Feld, Schlagreihenfolge, Coach-Satz und Bank', async () => {
    const { container } = zeigen(VOLL)
    const karte = await screen.findByRole('region', { name: 'Lineup' })

    // Feld: die neun Kuerzel stehen da, mit den Namen darauf
    expect(screen.getByText('Feld')).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()

    // Schlagreihenfolge: eine Zeile je Eintrag, in Schlagreihenfolge
    const zeilen = within(karte).getAllByRole('listitem')
    expect(zeilen).toHaveLength(2)
    expect(zeilen[0]).toHaveTextContent('Tom Test')
    expect(zeilen[1]).toHaveTextContent('Mia Meier')

    // Coach-Satz, wortgleich mit dem PDF
    expect(screen.getByText('1B Uli Unter · 3B zuletzt aus · #3')).toBeInTheDocument()

    // Bank: die Zugesagten minus Aufstellung minus Coaches
    const bank = screen.getByText(/^Bank/)
    expect(bank).toHaveTextContent('Bea Bank')
    expect(bank).not.toHaveTextContent('Uli Unter')
    expect(bank).not.toHaveTextContent('Mia Meier')
  })

  it('hebt die eigene Zeile und den eigenen Punkt hervor', async () => {
    const { container } = zeigen(VOLL)
    await screen.findByRole('region', { name: 'Lineup' })
    const hervorgehoben = container.querySelectorAll('[class*="amber-400"]')
    expect(hervorgehoben).toHaveLength(2)
    hervorgehoben.forEach(el => expect(el).toHaveTextContent('Mia Meier'))
  })

  it('hebt nichts hervor, wer nicht aufgestellt ist', async () => {
    const { container } = zeigen(VOLL, { playerId: BANK.id })
    await screen.findByRole('region', { name: 'Lineup' })
    expect(container.querySelectorAll('[class*="amber-400"]')).toHaveLength(0)
    expect(screen.queryByText(/nicht aufgestellt/i)).not.toBeInTheDocument()
  })

  it('nennt den Gegner des gewählten Spiels', async () => {
    zeigen(VOLL)
    expect(await screen.findByText(/Fireballs/)).toBeInTheDocument()
  })

  it('schaltet zwischen zwei Spielen um', async () => {
    zeigen(antwort({
      [SPIEL_1]: [eintrag(ANDERE, 'P', 1)],
      [SPIEL_2]: [eintrag(DRITTER, 'C', 1)],
    }))
    const karte = await screen.findByRole('region', { name: 'Lineup' })
    expect(within(karte).getAllByText('Tom Test').length).toBeGreaterThan(0)

    fireEvent.click(within(karte).getByRole('button', { name: 'Spiel 2' }))

    expect(within(karte).getAllByText('Uli Unter').length).toBeGreaterThan(0)
    expect(within(karte).queryByText('Tom Test')).not.toBeInTheDocument()
    expect(within(karte).getByText(/Köln Kings/)).toBeInTheDocument()
  })

  it('zeigt keine Coach-Zeile, wenn es keine Coaches gibt', async () => {
    const { container } = zeigen(antwort({ [SPIEL_1]: [eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2)] }))
    await screen.findByRole('region', { name: 'Lineup' })
    expect(container.textContent).not.toMatch(/zuletzt aus/)
    expect(screen.queryByText(/^1B /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^3B /)).not.toBeInTheDocument()
  })

  it('zeigt keine Bank-Zeile, wenn die Bank leer ist', async () => {
    zeigen(VOLL, { zusagen: [ICH, ANDERE, DRITTER] })
    await screen.findByRole('region', { name: 'Lineup' })
    expect(screen.queryByText(/^Bank/)).not.toBeInTheDocument()
  })

  it('sagt bei Netzfehler „nicht erreichbar"', async () => {
    zeigen(null)
    const karte = await screen.findByRole('region', { name: 'Lineup' })
    expect(within(karte).getByText(/nicht erreichbar/)).toBeInTheDocument()
    expect(screen.queryByText(NOCH_NICHT_FREIGEGEBEN)).not.toBeInTheDocument()
    expect(screen.queryByText(NOCH_KEINE_AUFSTELLUNG)).not.toBeInTheDocument()
  })

  it('zeigt bei gesperrtem Spieltag nur den erklärenden Satz', async () => {
    zeigen(antwort({}), { gameDay: spieltag({ aufstellungsLage: 'GESPERRT' }) })
    const karte = await screen.findByRole('region', { name: 'Lineup' })
    expect(within(karte).getByText(NOCH_NICHT_FREIGEGEBEN)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Spiel/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Feld')).not.toBeInTheDocument()
    expect(screen.queryByText(/Fireballs/)).not.toBeInTheDocument()
  })

  it('sagt bei einem freigegebenen, aber leeren Spiel den anderen Satz', async () => {
    zeigen(antwort({ [SPIEL_1]: [eintrag(ANDERE, 'P', 1)] }))
    const karte = await screen.findByRole('region', { name: 'Lineup' })
    fireEvent.click(within(karte).getByRole('button', { name: 'Spiel 2' }))
    expect(within(karte).getByText(NOCH_KEINE_AUFSTELLUNG)).toBeInTheDocument()
    expect(screen.queryByText(NOCH_NICHT_FREIGEGEBEN)).not.toBeInTheDocument()
  })

  it('sagt beim Laden weder „steht noch nicht" noch „nicht erreichbar"', async () => {
    zeigen(undefined)
    const karte = await screen.findByRole('region', { name: 'Lineup' })
    expect(within(karte).getByText(/lädt/)).toBeInTheDocument()
    expect(screen.queryByText(/nicht erreichbar/)).not.toBeInTheDocument()
    expect(screen.queryByText(NOCH_NICHT_FREIGEGEBEN)).not.toBeInTheDocument()
  })
})
