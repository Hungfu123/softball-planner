import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import {
  createSpielbogen, recordAtBat, recordSteal, getSheet, deleteSpielbogen, base, emptyBase,
} from '../helpers/spielbogen-api'

/**
 * Verschiedene Edge-Plays als isolierte Mini-Szenarien.
 * Jeder Test fokussiert einen spezifischen Play-Typ + verifiziert Backend-Sheet.
 */
test.describe('Spielbogen — Edge Plays', () => {

  test('Walkoff: HOME bottom-7 RBI-Single beendet Spiel sofort', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, homeSlotIds, awaySlotIds } =
      await createSpielbogen('2099-08-01', 'Heroes', 'Visitors', testInfo.parallelIndex)
    try {
      // 6 Innings je 3 Outs schnell durchlaufen, dann AWAY top-7 (1 Run)
      for (let inning = 1; inning <= 6; inning++) {
        // AWAY 3 quick Outs
        for (let s = 0; s < 3; s++) {
          await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[(inning + s) % 9], inning, result: 'STRIKEOUT' })
        }
        // HOME 3 quick Outs
        for (let s = 0; s < 3; s++) {
          await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[(inning + s) % 9], inning, result: 'STRIKEOUT' })
        }
      }
      // Top-7: AWAY scort 1 (Single + RBI-Double), dann 3 Outs
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 7, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 7, result: 'DOUBLE',
        baseStateAfter: base(null, awaySlotIds[1]), runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 7, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 7, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 7, result: 'STRIKEOUT' })
      // Bottom-7: HOME walkoff über Walk + Triple (Single würde reichen, Triple = klar dramatisch)
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 7, result: 'WALK', baseStateAfter: base(homeSlotIds[0]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 7, result: 'SINGLE',
        baseStateAfter: base(homeSlotIds[1], homeSlotIds[0]) })
      // Walkoff-Triple — 2 Runs scoren, Spiel endet ab home>away
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 7, result: 'TRIPLE',
        baseStateAfter: base(null, null, homeSlotIds[2]), runsScored: 2, rbi: 2 })

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.status).toBe('DONE')
      expect(sheet.meta.homeRuns).toBe(2)
      expect(sheet.meta.awayRuns).toBe(1)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Caught Stealing zählt als Out + endet Inning bei 3rd', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, homeSlotIds, awaySlotIds } =
      await createSpielbogen('2099-08-02', 'Bullets', 'Comets', testInfo.parallelIndex)
    try {
      // AWAY Inning 1: 2 Outs, dann Single + CS = 3rd Out
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[2]) })
      await recordSteal(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, type: 'CAUGHT_STEALING', fromBase: 1, toBase: 2 })

      // Sollte automatisch zu HOME wechseln (3 Outs)
      // HOME 3 Outs
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 1, result: 'STRIKEOUT' })

      const sheet = await getSheet(bogenId)
      // Stealing-Event ist gespeichert
      expect(sheet.stealingEvents.length).toBeGreaterThan(0)
      const cs = sheet.stealingEvents.find((e: { type: string }) => e.type === 'CAUGHT_STEALING')
      expect(cs).toBeDefined()
      // Aktuell sollte Inning 2 AWAY laufen (nach HOME 3 Outs Inning 1)
      expect(sheet.meta.currentInning).toBe(2)
      expect(sheet.meta.currentSide).toBe('AWAY')
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Double-Play 6-4-3 zählt 2 Outs + räumt Bases', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-08-03', 'Aces', 'Bandits', testInfo.parallelIndex)
    try {
      // AWAY Inning 1: 1 Out (K), Single, dann DP räumt → 3 Outs total
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[1]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'OUT',
        fielderChain: [6, 4, 3], outType: 'DOUBLE_PLAY', baseStateAfter: emptyBase })
      // Sollte direkt zu HOME wechseln (3 Outs erreicht via 1 K + DP=2 Outs)
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 1, result: 'STRIKEOUT' })

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.currentInning).toBe(2)
      expect(sheet.meta.currentSide).toBe('AWAY')
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Triple-Play zählt 3 Outs + beendet Inning sofort', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-08-04', 'Eagles', 'Falcons', testInfo.parallelIndex)
    try {
      // AWAY Inning 1: 2 Singles → Bases 1B+2B (Slot 1 auf 2B, Slot 2 auf 1B)
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[1], awaySlotIds[0]) })
      // TP räumt alles, 3 Outs → Inning vorbei
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'OUT',
        fielderChain: [6, 4, 3], outType: 'TRIPLE_PLAY', baseStateAfter: emptyBase })
      // HOME jetzt am Schlag
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'STRIKEOUT' })

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.currentSide).toBe('HOME')
      expect(sheet.meta.currentInning).toBe(1)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Bases-Loaded Walk forciert Runner zu Home (1 Run)', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-08-05', 'Phantoms', 'Knights', testInfo.parallelIndex)
    try {
      // AWAY: 3 Walks → Bases voll, dann Walk = 1 Run
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'WALK',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'WALK',
        baseStateAfter: base(awaySlotIds[1], awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'WALK',
        baseStateAfter: base(awaySlotIds[2], awaySlotIds[1], awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'WALK',
        baseStateAfter: base(awaySlotIds[3], awaySlotIds[2], awaySlotIds[1]), runsScored: 1, rbi: 1 })
      // 3 quick Outs
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 1, result: 'STRIKEOUT' })
      // HOME 3 Outs
      for (let s = 0; s < 3; s++) {
        await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning: 1, result: 'STRIKEOUT' })
      }
      const sheet = await getSheet(bogenId)
      expect(sheet.inningRuns?.['1']?.away ?? 0).toBe(1)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Sacrifice Fly (OUT mit sacrificeType=FLY) scort Runner-3B', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-08-06', 'Wolves', 'Bears', testInfo.parallelIndex)
    try {
      // AWAY: Triple → Runner-3B, dann Sac-Fly RBI 1
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'TRIPLE',
        baseStateAfter: base(null, null, awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'OUT',
        fielderChain: [8], sacrificeType: 'FLY', baseStateAfter: emptyBase,
        runsScored: 1, rbi: 1 })
      // 2 weitere Outs
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'STRIKEOUT' })
      // HOME 3 Outs
      for (let s = 0; s < 3; s++) {
        await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning: 1, result: 'STRIKEOUT' })
      }
      const sheet = await getSheet(bogenId)
      expect(sheet.inningRuns?.['1']?.away ?? 0).toBe(1)
      const sacFly = sheet.awayAtBats.find((a: { sacrificeType: string }) => a.sacrificeType === 'FLY')
      expect(sacFly).toBeDefined()
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Wild Pitch rückt Runner ohne Out', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds } =
      await createSpielbogen('2099-08-07', 'Sharks', 'Whales', testInfo.parallelIndex)
    try {
      // AWAY: Single, dann WP → Runner zu 2B
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordSteal(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, type: 'WILD_PITCH', fromBase: 1, toBase: 2 })

      const sheet = await getSheet(bogenId)
      const wp = sheet.stealingEvents.find((e: { type: string }) => e.type === 'WILD_PITCH')
      expect(wp).toBeDefined()
      // Kein Out → currentSide bleibt AWAY
      expect(sheet.meta.currentSide).toBe('AWAY')
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })
})
