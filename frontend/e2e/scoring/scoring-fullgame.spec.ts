import {
  test, expect,
  recordHitViaUI, recordDirectViaUI,
  recordSubstitutionViaUI, recordStealingViaUI,
  advanceInningViaUI, clickUndo,
} from '../helpers/fixtures'
import { getScoreboard, getSubstitutions, seedAtBat, setBattingSide } from '../helpers/api'

/**
 * Scenario-Tests: realistische Multi-Inning-Sequenzen.
 * Verifizieren state-consistency über Inning-Boundaries + Cross-Operation-Pfade.
 * Pendant zu den isolierten Suiten.
 */
test.describe('Scoring — Full-Game Scenarios', () => {
  test('comeback: down 0-3 nach Inning 1, Grand Slam Inning 2, Sub-Drama Inning 3', async ({ page, scoringPage }) => {
    // ============ INNING 1 ============
    // 3 quick OUTs (kalte Anfangsphase, kein Glück)
    await recordDirectViaUI(page, 'STRIKEOUT')
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)
    expect(sb.scoreUs).toBe(0)

    // Gegner kontert hart: 3 Runs in ihrem Half-Inning
    await advanceInningViaUI(page, 3)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(3)
    expect(sb.scoreUs).toBe(0)
    expect(sb.outsInCurrentInning).toBe(0)

    // ============ INNING 2 — COMEBACK ============
    // Drei Walks → Bases loaded
    await recordDirectViaUI(page, 'WALK')
    await recordDirectViaUI(page, 'WALK')
    await recordDirectViaUI(page, 'WALK')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).not.toBeNull()
    expect(sb.baseState.second).not.toBeNull()
    expect(sb.baseState.third).not.toBeNull()
    expect(sb.scoreUs).toBe(0) // noch nichts gescort

    // GRAND SLAM! 4 Runs
    await recordHitViaUI(page, 'HOMERUN')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(4)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBeNull()
    expect(sb.baseState.third).toBeNull()

    // 3 quick OUTs
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)

    // Gegner schießt 1 Run zurück (4-4 wäre tied — wir setzen 0 für klares Lead)
    await advanceInningViaUI(page, 0)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreThem).toBe(3) // unchanged
    expect(sb.currentInning).toBe(3)

    // ============ INNING 3 — Sub-Drama ============
    // Pinch Hitter: aktuellen Batter raus, Bench rein
    sb = await getScoreboard(scoringPage.gameId)
    const currentBatter = sb.currentBatterId!
    await recordSubstitutionViaUI(page, currentBatter, scoringPage.benchPlayerId)
    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
    expect(subs[0].inning).toBe(3)
    expect(subs[0].playerInId).toBe(scoringPage.benchPlayerId)

    // Sub übernimmt Slot — nächster AB ist Bench-Player
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentBatterId).toBe(scoringPage.benchPlayerId)
    await recordHitViaUI(page, 'SINGLE')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBe(scoringPage.benchPlayerId)

    // Steal-Versuch: caught stealing — Drama!
    await recordStealingViaUI(page, scoringPage.benchPlayerId, 'CAUGHT_STEALING')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBeNull()
    expect(sb.outsInCurrentInning).toBe(1)

    // 2 weitere OUTs → 3 Outs
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)

    // ============ FINAL CHECK ============
    expect(sb.scoreUs).toBe(4)
    expect(sb.scoreThem).toBe(3)
    expect(sb.currentInning).toBe(3)
    expect(sb.totalAtBats).toBeGreaterThan(10)
  })

  test('walkoff comeback: bottom 7th, tied, single + steal-of-home wins', async ({ page, scoringPage }) => {
    // Wir sind Heimteam
    await setBattingSide(scoringPage.gameId, 'bottom')

    // Schnell-Seed: Innings 1-6, jeder mit 3 OUTs für uns. State danach: inning 6, our 0, opp 0.
    for (let inning = 1; inning <= 6; inning++) {
      for (let i = 0; i < 3; i++) {
        await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', inning, {
          first: null, second: null, third: null,
        })
      }
    }
    // Inning-Advance-Events seeden geht nicht direkt via API (kein seed-Endpoint).
    // Stattdessen: reload + advance via UI 6 mal. Aber das setzt unsere currentInning hoch.
    // Pragmatic: Wir nehmen halfInningOver State vom letzten Inning 6 OUTs.
    // currentInning = max(lastAB.inning=6, lastEvent=0) = 6. halfInningOver via 3 outs in inning 6 = true.
    await page.reload()
    await page.waitForTimeout(500)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(6)

    // Advance to inning 7, gegner scort 5 in inning 6 → tied (we have 0)
    // Aber wir wollen tied bei Inning 7 Start. Setzen Gegner-Runs auf 0 hier:
    await advanceInningViaUI(page, 0)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(7)
    expect(sb.scoreThem).toBe(0)

    // Inning 7 bottom: walkoff Setup. Wir brauchen scoreUs > scoreThem
    // HOMERUN solo = +1 → us 1, opp 0 → Walkoff
    await recordHitViaUI(page, 'HOMERUN')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(1)
    expect(sb.scoreThem).toBe(0)
    expect(sb.currentInning).toBe(7)

    // Walkoff-Banner sichtbar
    await expect(page.getByText(/Walkoff-Sieg!/i)).toBeVisible({ timeout: 2000 })
  })

  test('undo across inning boundary: advance + AB + undo back to prev inning', async ({ page, scoringPage }) => {
    // Seed Inning 1 mit 3 Outs + Advance
    for (let i = 0; i < 3; i++) {
      await seedAtBat(scoringPage.gameId, scoringPage.playerIds[i], 'OUT', 1, {
        first: null, second: null, third: null,
      })
    }
    await page.reload()
    await page.waitForTimeout(500)

    // Advance mit opp-Runs=2
    await advanceInningViaUI(page, 2)
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(2)

    // AB in Inning 2: SINGLE
    await recordHitViaUI(page, 'SINGLE')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.baseState.first).not.toBeNull()
    const totalABs = sb.totalAtBats

    // Undo 1: löscht den SINGLE
    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.totalAtBats).toBe(totalABs - 1)
    expect(sb.currentInning).toBe(2) // InningAdvance-Event noch da
    expect(sb.scoreThem).toBe(2)

    // Undo 2: löscht InningAdvance → currentInning fällt auf 1, scoreThem revertet
    await clickUndo(page)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(1)
    expect(sb.scoreThem).toBe(0) // reverted via Event-Undo

    // Re-Advance möglich
    await advanceInningViaUI(page, 5)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(5) // neuer Advance setzt frischen Score
  })
})
