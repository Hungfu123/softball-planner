import { test, expect, recordSubstitutionViaUI, recordHitViaUI } from '../helpers/fixtures'
import { getBattingStats, getScoreboard, getSubstitutions } from '../helpers/api'

test.describe('Scoring — Substitution', () => {
  test('Sub persists to backend with correct playerOut/In/inning @smoke', async ({ page, scoringPage }) => {
    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const subs = await getSubstitutions(scoringPage.gameId)
    expect(subs).toHaveLength(1)
    expect(subs[0].playerOutId).toBe(scoringPage.playerIds[0])
    expect(subs[0].playerInId).toBe(scoringPage.benchPlayerId)
    expect(subs[0].inning).toBe(1)
  })

  test('Sub changes currentBatter to substitute', async ({ page, scoringPage }) => {
    const before = await getScoreboard(scoringPage.gameId)
    expect(before.currentBatterId).toBe(scoringPage.playerIds[0])

    await recordSubstitutionViaUI(page, scoringPage.playerIds[0], scoringPage.benchPlayerId)

    const after = await getScoreboard(scoringPage.gameId)
    expect(after.currentBatterId).toBe(scoringPage.benchPlayerId)
  })

  test('Stats der Eingewechselten laufen auf sie, nicht auf die Ausgewechselte', async ({ page, scoringPage }) => {
    const out = scoringPage.playerIds[0]
    const inP = scoringPage.benchPlayerId

    await recordSubstitutionViaUI(page, out, inP)
    const sb = await getScoreboard(scoringPage.gameId)
    expect(sb.currentBatterId).toBe(inP)

    await recordHitViaUI(page, 'SINGLE')

    const stats = await getBattingStats(scoringPage.gameId)
    const sub = stats.find(p => p.playerId === inP)
    const starter = stats.find(p => p.playerId === out)

    // Die Eingewechselte steht ueberhaupt in den Stats und hat den Hit.
    expect(sub).toBeTruthy()
    expect(sub!.hits).toBe(1)
    expect(sub!.atBats).toBe(1)
    // Die Ausgewechselte darf nichts davon abbekommen.
    expect(starter?.hits ?? 0).toBe(0)
    expect(starter?.plateAppearances ?? 0).toBe(0)
  })

  test('Leistung VOR der Auswechslung bleibt bei der Ausgewechselten', async ({ page, scoringPage }) => {
    const out = scoringPage.playerIds[0]
    const inP = scoringPage.benchPlayerId

    await recordHitViaUI(page, 'SINGLE')
    let stats = await getBattingStats(scoringPage.gameId)
    expect(stats.find(p => p.playerId === out)?.hits).toBe(1)

    await recordSubstitutionViaUI(page, out, inP)

    stats = await getBattingStats(scoringPage.gameId)
    const starter = stats.find(p => p.playerId === out)
    expect(starter?.hits).toBe(1)
    expect(starter?.atBats).toBe(1)
    // Die Eingewechselte startet bei null — sie erbt nichts.
    expect(stats.find(p => p.playerId === inP)?.hits ?? 0).toBe(0)
  })
})
