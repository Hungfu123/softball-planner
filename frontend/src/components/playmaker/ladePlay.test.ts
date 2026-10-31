import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ladePlayMitRueckfall, PlayNichtGefunden } from './ladePlay'
import * as api from '@/api/plays'
import type { Play } from './board/types'

vi.mock('@/api/plays')

const play = (id: number): Play => ({
  id,
  title: `Play ${id}`,
  categoryId: 1,
  gameState: 'ANY',
  gameStateNote: null,
  counterpartPlayId: null,
  steps: [],
})

describe('ladePlayMitRueckfall', () => {
  beforeEach(() => vi.resetAllMocks())

  it('nimmt das Play aus der Liste, wenn der Einzelabruf scheitert', async () => {
    // Der Offline-Fall: der Service-Worker hat die LISTE, nicht /api/plays/7.
    vi.mocked(api.getPlay).mockRejectedValue(new Error('kein Netz'))
    vi.mocked(api.getPlays).mockResolvedValue([play(7)])

    await expect(ladePlayMitRueckfall(7)).resolves.toMatchObject({ id: 7 })
  })

  it('sagt „gibt es nicht", wenn die Liste da ist und das Play fehlt', async () => {
    // Das ist der Unterschied, der am Bildschirm zaehlt: die Liste kam durch, also ist
    // das Netz in Ordnung — das Play gibt es schlicht nicht mehr. Vorher bekam ein
    // toter Link die Meldung „nicht im Zwischenspeicher. Ohne Netz ...".
    vi.mocked(api.getPlay).mockRejectedValue(new Error('Fehler 404'))
    vi.mocked(api.getPlays).mockResolvedValue([play(1)])

    await expect(ladePlayMitRueckfall(99)).rejects.toBeInstanceOf(PlayNichtGefunden)
  })

  it('bleibt beim ersten Fehler, wenn auch die Liste scheitert', async () => {
    const netz = new Error('kein Netz')
    vi.mocked(api.getPlay).mockRejectedValue(netz)
    vi.mocked(api.getPlays).mockRejectedValue(new Error('auch nicht'))

    await expect(ladePlayMitRueckfall(7)).rejects.toBe(netz)
  })
})
