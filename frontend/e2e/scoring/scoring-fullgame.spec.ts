import {
  test, expect,
  recordHitViaUI, recordDirectViaUI,
  recordSubstitutionViaUI, recordStealingViaUI,
  advanceInningViaUI, clickUndo,
} from '../helpers/fixtures'
import { getScoreboard, getSubstitutions, seedAtBat } from '../helpers/api'

/**
 * Scenario-Tests: realistische Multi-Inning-Sequenzen.
 * Verifizieren state-consistency über Inning-Boundaries + Cross-Operation-Pfade.
 * Pendant zu den isolierten Suiten (die jeweils nur 1 Op testen).
 */
test.describe('Scoring — Full-Game Scenarios', () => {
  test('multi-inning sequence: ABs + Stealing + Sub + InningAdvance', async ({ page, scoringPage }) => {
    // === Inning 1 (top) ===
    // AB1: SINGLE (Khang → 1B)
    await recordHitViaUI(page, 'SINGLE')
    let sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBe(scoringPage.playerIds[0])
    expect(sb.currentInning).toBe(1)

    // Stealing: Khang stiehlt 2B
    await recordStealingViaUI(page, scoringPage.playerIds[0], 'STOLEN_BASE')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).toBeNull()
    expect(sb.baseState.second).toBe(scoringPage.playerIds[0])

    // AB2: DOUBLE (Florian → 2B, Khang scort von 2B → home)
    await recordHitViaUI(page, 'DOUBLE')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBeGreaterThanOrEqual(1) // Khang home

    // AB3, AB4, AB5: 3× OUT um Inning zu beenden
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)

    // Advance Inning 2 mit opp-Runs=1
    await advanceInningViaUI(page, 1)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(1)
    expect(sb.outsInCurrentInning).toBe(0) // Reset bei Inning-Wechsel

    // === Inning 2 ===
    // Substitution: playerIds[0] → benchPlayer
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)
    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
    expect(subs[0].inning).toBe(2)

    // AB1 (Inning 2): WALK
    await recordDirectViaUI(page, 'WALK')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.baseState.first).not.toBeNull()
    expect(sb.currentInning).toBe(2)

    // AB2 Inning 2: HOMERUN solo → +2 runs? nein, runner war auf 1B → +2 (1B + batter scoren)
    const scoreBeforeHR = sb.scoreUs
    await recordHitViaUI(page, 'HOMERUN')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.scoreUs).toBe(scoreBeforeHR + 2) // 1B-runner + batter
    expect(sb.baseState.first).toBeNull()

    // 3× OUT um Inning 2 zu beenden
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    await recordDirectViaUI(page, 'OUT')
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.outsInCurrentInning).toBe(3)

    // Final-State-Konsistenz
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(1) // unchanged seit Advance
    expect(sb.scoreUs).toBeGreaterThanOrEqual(3) // mindestens DOUBLE-run + 2 HR-runs
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

    // Inning 1 hat noch die 3 OUTs
    expect(sb.outsInCurrentInning).toBe(3)
    expect(sb.totalAtBats).toBe(3) // 3 seeded outs bleiben

    // Re-Advance möglich?
    await advanceInningViaUI(page, 5)
    sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentInning).toBe(2)
    expect(sb.scoreThem).toBe(5) // neuer Advance setzt frischen Score
  })
})
