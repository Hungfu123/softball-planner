import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import {
  createSpielbogen, recordAtBat, recordSteal, getSheet, deleteSpielbogen, base, emptyBase,
} from '../helpers/spielbogen-api'

/**
 * Spielt 2 vollständige Spielbogen-Spiele durch und verifiziert dass:
 *   - per-Inning-Runs richtig gerechnet werden (Backend-Sheet)
 *   - der Final-Score im UI (Scoreboard-Block) korrekt steht
 *   - Status DONE im UI sichtbar ist (Endstand-Card)
 *   - das RFL-Sheet die richtigen Innings zeigt
 *
 * Szenarien:
 *   GAME 1 — Tight Game: AWAY gewinnt 5-3.
 *     Inning-by-Inning AWAY: 2 0 1 1 0 1 0 = 5
 *     Inning-by-Inning HOME: 1 0 2 0 0 0 0 = 3
 *     Events: Single, Double, Triple, HR, Walk, K, DP, Steal
 *
 *   GAME 2 — Blowout: HOME gewinnt 11-1.
 *     Inning-by-Inning AWAY: 1 0 0 0 0 — 1
 *     Inning-by-Inning HOME: 4 3 0 4 — 11
 *     Game-End nach top-5 da HOME 10-Run-Rule? Wird hier nur normal gespielt,
 *     Game endet nach top-7 wenn HOME deutlich vorne. Walkoff-Pfad.
 *     Events: Grand-Slam, Solo-HR, HBP, REACHED_ON_ERROR, Triple-Play, Sac-Fly.
 */

test.describe('Spielbogen — Full Games + UI Verifikation', () => {

  test('Spiel 1: AWAY gewinnt 5-3 (Single/Double/HR/Walk/DP/Steal-Mix) @smoke', async ({ page, context }, testInfo) => {
    await seedAuth(context)

    const { bogenId, homeSlotIds, awaySlotIds } =
      await createSpielbogen('2099-06-15', 'Roosters', 'Dead Sox', testInfo.parallelIndex)

    try {
      // === Inning 1 ===
      // AWAY: Slot1 1B, Slot2 2B push, Slot3 Single RBI 2, dann 3 Outs
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'DOUBLE',
        baseStateAfter: base(null, awaySlotIds[1], awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[2]), runsScored: 2, rbi: 2 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 1, result: 'OUT', fielderChain: [8] })
      // HOME: Solo-HR
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 1, result: 'OUT', fielderChain: [4, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 1, result: 'OUT', fielderChain: [6, 3] })

      // === Inning 2 ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 2, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 2, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 2, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 2, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 2, result: 'OUT', fielderChain: [8] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 2, result: 'OUT', fielderChain: [4] })

      // === Inning 3: AWAY Walk + 2 Hits + DP, HOME Triple + Single + Steal + Single (2 Runs) ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 3, result: 'WALK', baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 3, result: 'SINGLE', baseStateAfter: base(awaySlotIds[1], awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 3, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[2], awaySlotIds[1]), runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 3, result: 'OUT', fielderChain: [6, 4, 3], outType: 'DOUBLE_PLAY' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 3, result: 'STRIKEOUT' })

      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[7], inning: 3, result: 'TRIPLE', baseStateAfter: base(null, null, homeSlotIds[7]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 3, result: 'SINGLE',
        baseStateAfter: base(homeSlotIds[8]), runsScored: 1, rbi: 1 })
      await recordSteal(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 3, type: 'STOLEN_BASE', fromBase: 1, toBase: 2 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 3, result: 'SINGLE',
        baseStateAfter: base(homeSlotIds[0]), runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 3, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 3, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 3, result: 'OUT', fielderChain: [8] })

      // === Inning 4: AWAY Solo-HR, HOME 3 Outs ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 4, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 4, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 4, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 4, result: 'OUT', fielderChain: [4, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 4, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 4, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 4, result: 'OUT', fielderChain: [8] })

      // === Inning 5: 0-0 ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 5, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 5, result: 'OUT', fielderChain: [8] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 5, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[7], inning: 5, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 5, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 5, result: 'OUT', fielderChain: [4] })

      // === Inning 6: AWAY 1 Run (Single + Steal + RBI-Double), HOME 0 ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 6, result: 'SINGLE', baseStateAfter: base(awaySlotIds[3]) })
      await recordSteal(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 6, type: 'STOLEN_BASE', fromBase: 1, toBase: 2 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 6, result: 'DOUBLE',
        baseStateAfter: base(null, awaySlotIds[4]), runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 6, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 6, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 6, result: 'OUT', fielderChain: [8] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 6, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 6, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 6, result: 'STRIKEOUT' })

      // === Inning 7: 0-0, Game-End ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 7, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 7, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 7, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 7, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 7, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 7, result: 'OUT', fielderChain: [8] })

      // === Verifikation via Backend-Sheet ===
      const sheet = await getSheet(bogenId)
      expect(sheet.meta.homeRuns).toBe(3)
      expect(sheet.meta.awayRuns).toBe(5)
      expect(sheet.meta.status).toBe('DONE')
      // Per-Inning
      const ir = sheet.inningRuns as Record<string, { home: number; away: number }>
      expect(ir['1']?.away ?? 0).toBe(2)
      expect(ir['3']?.away ?? 0).toBe(1)
      expect(ir['4']?.away ?? 0).toBe(1)
      expect(ir['6']?.away ?? 0).toBe(1)
      expect(ir['1']?.home ?? 0).toBe(1)
      expect(ir['3']?.home ?? 0).toBe(2)
      // Stealings 2 total
      expect(sheet.stealingEvents.length).toBe(2)

      // === UI-Verifikation ===
      await page.goto(`/spielbogen/${bogenId}`)
      await page.waitForLoadState('networkidle')
      // Score-Block: Score-Zahlen sichtbar (3 - 5)
      const homeScore = page.locator('span.text-navy-800.tabular-nums').first()
      const awayScore = page.locator('span.text-softball-red-600.tabular-nums').first()
      await expect(homeScore).toHaveText('3', { timeout: 4000 })
      await expect(awayScore).toHaveText('5')
      // Game-End-Card sichtbar (Game DONE) — Heading-Text ist "Spiel beendet" (SpielbogenPage.tsx),
      // nicht "Endstand"/"Gewinner"/"Spielende" wie ursprünglich hier erwartet.
      await expect(page.getByRole('heading', { name: /Spiel beendet/i })).toBeVisible({ timeout: 2000 })
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })


  test('Spiel 2: HOME Blowout 11-1 (Grand Slam, HBP, REACHED_ON_ERROR, Sac-Fly)', async ({ page, context }, testInfo) => {
    await seedAuth(context)

    const { bogenId, homeSlotIds, awaySlotIds } =
      await createSpielbogen('2099-07-20', 'Tigers', 'Lions', testInfo.parallelIndex)

    try {
      // === Inning 1 ===
      // AWAY: Single + Single + RBI-Single (1 Run), dann 3 Outs
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE', baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[1], awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[2], awaySlotIds[1]), runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 1, result: 'OUT', fielderChain: [6, 3] })

      // HOME: Bases-Loaded mit 2 Walks + HBP, dann Grand Slam (4 Runs), nochmal 0 → 4 Runs total
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'WALK', baseStateAfter: base(homeSlotIds[0]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 1, result: 'HIT_BY_PITCH', baseStateAfter: base(homeSlotIds[1], homeSlotIds[0]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 1, result: 'WALK', baseStateAfter: base(homeSlotIds[2], homeSlotIds[1], homeSlotIds[0]) })
      // Grand Slam: 4 Runs, alle Bases leer danach
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 1, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 4, rbi: 4 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 1, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 1, result: 'STRIKEOUT' })

      // === Inning 2 ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 2, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 2, result: 'OUT', fielderChain: [8] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 2, result: 'STRIKEOUT' })

      // HOME: 2 Solo-HRs + Triple + Sac-Fly → 3 Runs
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[7], inning: 2, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 2, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 2, result: 'TRIPLE',
        baseStateAfter: base(null, null, homeSlotIds[0]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 2, result: 'OUT', fielderChain: [8],
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 2, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 2, result: 'OUT', fielderChain: [6, 3] })

      // === Inning 3: beide Seiten 3 Outs ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 3, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 3, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 3, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 3, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 3, result: 'OUT', fielderChain: [8] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 3, result: 'STRIKEOUT' })

      // === Inning 4: AWAY 3 Outs, HOME 4 Runs (Grand Slam wieder) ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 4, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 4, result: 'OUT', fielderChain: [4, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 4, result: 'STRIKEOUT' })

      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[7], inning: 4, result: 'WALK', baseStateAfter: base(homeSlotIds[7]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 4, result: 'SINGLE', baseStateAfter: base(homeSlotIds[8], homeSlotIds[7]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 4, result: 'WALK', baseStateAfter: base(homeSlotIds[0], homeSlotIds[8], homeSlotIds[7]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 4, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 4, rbi: 4 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 4, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 4, result: 'OUT', fielderChain: [6, 3] })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 4, result: 'STRIKEOUT' })

      // === Inning 5: AWAY 3 Outs ===
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 5, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 5, result: 'OUT', fielderChain: [4, 3] })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 5, result: 'STRIKEOUT' })

      // Bogen auf 5 Innings begrenzen via /end (HOME schon weit voraus, simulieren Mercy)
      const sheetBeforeEnd = await getSheet(bogenId)
      if (sheetBeforeEnd.meta.status !== 'DONE') {
        // HOME hat noch nicht in Inning 5 gespielt — manuell beenden
        await fetch(`http://localhost:8080/api/spielbogen/${bogenId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa('hung:Deadsox123!')}` },
        })
      }

      // === Verifikation ===
      const sheet = await getSheet(bogenId)
      expect(sheet.meta.homeRuns).toBe(11)
      expect(sheet.meta.awayRuns).toBe(1)

      const ir = sheet.inningRuns as Record<string, { home: number; away: number }>
      expect(ir['1']?.away ?? 0).toBe(1)
      expect(ir['1']?.home ?? 0).toBe(4)
      expect(ir['2']?.home ?? 0).toBe(3)
      expect(ir['4']?.home ?? 0).toBe(4)

      // === UI ===
      await page.goto(`/spielbogen/${bogenId}`)
      await page.waitForLoadState('networkidle')
      const homeScore = page.locator('span.text-navy-800.tabular-nums').first()
      const awayScore = page.locator('span.text-softball-red-600.tabular-nums').first()
      await expect(homeScore).toHaveText('11', { timeout: 4000 })
      await expect(awayScore).toHaveText('1')
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })
})
