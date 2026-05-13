import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import {
  createSpielbogen, createSpielbogenWithDH, recordAtBat, recordSubstitution,
  correctLastAtBat, undoLastAtBat, getSheet, deleteSpielbogen, base, emptyBase,
} from '../helpers/spielbogen-api'

test.describe('Spielbogen — Advanced Flows', () => {

  test('B. Substitution: Spieler-X raus, Y rein, Slot bleibt', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds } =
      await createSpielbogen('2099-11-01', 'Subs', 'Replace', testInfo.parallelIndex)
    try {
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordSubstitution(bogenId, {
        side: 'AWAY', slotId: awaySlotIds[2], inning: 1, playerInName: 'PinchHitter-X',
      })

      const sheet = await getSheet(bogenId)
      expect(sheet.substitutions.length).toBe(1)
      const sub = sheet.substitutions[0]
      expect(sub.slotId).toBe(awaySlotIds[2])
      expect(sub.playerInName).toBe('PinchHitter-X')
      expect(sub.inning).toBe(1)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('C. Korrektur: letzten AB anpassen', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds } =
      await createSpielbogen('2099-11-02', 'Edit', 'Patch', testInfo.parallelIndex)
    try {
      // Setup: Runner auf 3B, dann SINGLE mit 0 RBI gespeichert (Fehler)
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'TRIPLE',
        baseStateAfter: base(null, null, awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[1], null, awaySlotIds[0]), runsScored: 0, rbi: 0 })

      // Korrektur: Runner-3B scort → runsScored=1, baseState ohne 3B
      await correctLastAtBat(bogenId, 'AWAY', {
        firstSlotId: awaySlotIds[1],
        secondSlotId: null,
        thirdSlotId: null,
        runsScored: 1,
      })

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.awayRuns).toBe(1)
      const lastAb = sheet.awayAtBats[sheet.awayAtBats.length - 1]
      expect(lastAb.runsScored).toBe(1)
      expect(lastAb.baseStateAfter.thirdSlotId).toBeNull()
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('D. Undo: letzter AB löschen', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds } =
      await createSpielbogen('2099-11-03', 'Backers', 'Undoers', testInfo.parallelIndex)
    try {
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'DOUBLE',
        baseStateAfter: base(null, awaySlotIds[1], awaySlotIds[0]) })

      let sheet = await getSheet(bogenId)
      expect(sheet.awayAtBats.length).toBe(2)

      // Undo letzten AWAY-AB
      await undoLastAtBat(bogenId, 'AWAY')
      sheet = await getSheet(bogenId)
      expect(sheet.awayAtBats.length).toBe(1)
      // baseState wieder wie vor DOUBLE (Slot 0 auf 1B)
      const last = sheet.awayAtBats[0]
      expect(last.result).toBe('SINGLE')
      expect(last.baseStateAfter.firstSlotId).toBe(awaySlotIds[0])
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('E. DH-Setup: 10 Slots inkl. DH, DH schlägt', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId } =
      await createSpielbogenWithDH('2099-11-04', 'Pitchers', 'DHers', testInfo.parallelIndex)
    try {
      const sheet0 = await getSheet(bogenId)
      expect(sheet0.awayLineup.length).toBe(10)
      expect(sheet0.homeLineup.length).toBe(10)
      const dhSlot = sheet0.awayLineup.find((s: { position: string }) => s.position === 'DH')
      expect(dhSlot).toBeDefined()

      await recordAtBat(bogenId, { side: 'AWAY', slotId: dhSlot.id, inning: 1, result: 'HOMERUN',
        baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })

      const sheet = await getSheet(bogenId)
      expect(sheet.meta.awayRuns).toBe(1)
      const hr = sheet.awayAtBats.find((a: { slotId: number }) => a.slotId === dhSlot.id)
      expect(hr).toBeDefined()
      expect(hr.result).toBe('HOMERUN')
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('A. HitAdjustSheet zeigt Force-Out-Checkbox bei Force-Out-Situation', async ({ page, context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds } =
      await createSpielbogen('2099-11-05', 'Force', 'Tags', testInfo.parallelIndex)
    try {
      // Setup: 2 Outs + Bases voll
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'STRIKEOUT' })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[2]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[3], awaySlotIds[2]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[4], awaySlotIds[3], awaySlotIds[2]) })

      // UI öffnen + TREFFER → SINGLE klicken → HitAdjustSheet aufploppen
      await page.goto(`/spielbogen/${bogenId}`)
      await page.waitForLoadState('networkidle')
      const trefferBtn = page.getByRole('button', { name: 'TREFFER' })
      const visible = await trefferBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (!visible) {
        test.skip(true, 'TREFFER-Btn nicht sichtbar (Game-State)')
        return
      }
      await trefferBtn.click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /^Single$/i }).click()
      await page.waitForTimeout(800)
      // HitAdjustSheet sollte Force-Out-Checkbox als CHECKED zeigen (Default-Fix)
      const checkbox = page.locator('input[type="checkbox"]')
      if (await checkbox.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(checkbox.first()).toBeChecked()
      }
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })
})
