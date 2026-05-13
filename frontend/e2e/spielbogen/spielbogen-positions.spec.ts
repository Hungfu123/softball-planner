import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import {
  createSpielbogen, recordAtBat, getSheet, deleteSpielbogen, base, emptyBase,
} from '../helpers/spielbogen-api'

/**
 * Plays von jeder Defense-Position. Verifiziert dass:
 *   - jede Position als fielderChain akzeptiert wird (P/C/1B/2B/3B/SS/LF/CF/RF = 1..9)
 *   - die Spielernamen + Lineup im Browser-View korrekt angezeigt werden
 */

const POSITIONS_CHAIN: { name: string; chain: number[]; pos: string }[] = [
  { name: 'Pitcher Groundout 1-3', chain: [1, 3], pos: 'P' },
  { name: 'Catcher Foul-Out F2', chain: [2], pos: 'C' },
  { name: 'First-Base Unassisted 3', chain: [3], pos: '1B' },
  { name: 'Second-Base 4-3', chain: [4, 3], pos: '2B' },
  { name: 'Shortstop 6-3', chain: [6, 3], pos: 'SS' },
  { name: 'Third-Base 5-3', chain: [5, 3], pos: '3B' },
  { name: 'Left Fly F7', chain: [7], pos: 'LF' },
  { name: 'Center Fly F8', chain: [8], pos: 'CF' },
  { name: 'Right Fly F9', chain: [9], pos: 'RF' },
]

test.describe('Spielbogen — Plays jeder Position', () => {
  test('alle 9 Positions-Outs in 1 Spiel + UI zeigt Spielernamen', async ({ page, context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-09-01', 'Defenders', 'Attackers', testInfo.parallelIndex)
    try {
      // 9 verschiedene Outs in AWAY-Halftes (über 3 Innings je 3 Outs)
      for (let i = 0; i < POSITIONS_CHAIN.length; i++) {
        const inning = Math.floor(i / 3) + 1
        const play = POSITIONS_CHAIN[i]
        await recordAtBat(bogenId, {
          side: 'AWAY',
          slotId: awaySlotIds[i],
          inning,
          result: 'OUT',
          fielderChain: play.chain,
          baseStateAfter: emptyBase,
        })
      }
      // HOME 3 Outs pro Inning damit Auto-Switch sauber läuft
      for (let inning = 1; inning <= 3; inning++) {
        for (let s = 0; s < 3; s++) {
          await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning, result: 'STRIKEOUT' })
        }
      }

      const sheet = await getSheet(bogenId)
      // Alle 9 AWAY-Outs gespeichert mit korrektem fielderChain
      expect(sheet.awayAtBats.length).toBe(9)
      for (let i = 0; i < POSITIONS_CHAIN.length; i++) {
        const ab = sheet.awayAtBats[i]
        expect(ab.result).toBe('OUT')
        expect(ab.fielderChain).toEqual(POSITIONS_CHAIN[i].chain)
      }
      // Aktuell Inning 4 AWAY
      expect(sheet.meta.currentInning).toBe(4)
      expect(sheet.meta.currentSide).toBe('AWAY')

      // === UI: Lineup mit Spielernamen + Positionen verifizieren ===
      await page.goto(`/spielbogen/${bogenId}`)
      await page.waitForLoadState('networkidle')
      // Team-Namen im Score-Block immer sichtbar
      await expect(page.getByText('Defenders').first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Attackers').first()).toBeVisible()
      // RFL-Sheet öffnen für Spielernamen
      await page.locator('button[aria-label="Spielbogen anzeigen"]').first().click()
      await page.waitForTimeout(500)
      // Default Sheet-Side = currentSide (AWAY=Attackers). Spielernamen sichtbar.
      await expect(page.getByText('Attackers-1').first()).toBeVisible({ timeout: 4000 })
      await expect(page.getByText('Attackers-5').first()).toBeVisible()
      // Auf HOME-Side switchen ("Heim"-Pill im RFL-Sheet)
      await page.getByRole('button', { name: /^Heim$/i }).click()
      await page.waitForTimeout(300)
      await expect(page.getByText('Defenders-1').first()).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('Defenders-5').first()).toBeVisible()
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Single-Run von verschiedenen Spielern + UI zeigt RBI-Spieler @smoke', async ({ page, context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-09-02', 'Hunters', 'Foxes', testInfo.parallelIndex)
    try {
      // Slot 3 (3B-Position-Player namens "Foxes-3") soll RBI-Single haben
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'TRIPLE',
        baseStateAfter: base(null, null, awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[1]), runsScored: 1, rbi: 1 })
      // 3 Outs zum Auto-Switch
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 1, result: 'STRIKEOUT' })
      for (let s = 0; s < 3; s++) {
        await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning: 1, result: 'STRIKEOUT' })
      }

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.awayRuns).toBe(1)
      // Triple-Spieler (slot 1 = name "Foxes-1") + RBI-Spieler (slot 2 = "Foxes-2") im AB
      const triple = sheet.awayAtBats.find((a: { result: string }) => a.result === 'TRIPLE')
      const rbiSingle = sheet.awayAtBats.find((a: { rbi: number }) => a.rbi === 1)
      expect(triple).toBeDefined()
      expect(rbiSingle).toBeDefined()

      // === UI Verifikation ===
      await page.goto(`/spielbogen/${bogenId}`)
      await page.waitForLoadState('networkidle')
      // Score 0-1 (HOME 0, AWAY 1)
      const awayScore = page.locator('span.text-softball-red-600.tabular-nums').first()
      await expect(awayScore).toHaveText('1', { timeout: 5000 })
      // Spielbogen anzeigen öffnen
      await page.locator('button[aria-label="Spielbogen anzeigen"]').first().click()
      await page.waitForTimeout(500)
      // Spielernamen "Foxes-1" + "Foxes-2" im Lineup sichtbar
      await expect(page.getByText('Foxes-1').first()).toBeVisible({ timeout: 4000 })
      await expect(page.getByText('Foxes-2').first()).toBeVisible()
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })
})
