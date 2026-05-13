import { test, expect } from '@playwright/test'
import { seedAuth } from '../helpers/auth'
import {
  createSpielbogen, recordAtBat, getSheet, deleteSpielbogen, base, emptyBase,
} from '../helpers/spielbogen-api'

test.describe('Spielbogen — Out-Vielfalt', () => {

  test('DP/TP/Fly/Foul/Force/SacFly/SacBunt in einem Spiel', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-10-01', 'Plates', 'Mitts', testInfo.parallelIndex)
    try {
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'OUT',
        fielderChain: [6, 4, 3], outType: 'DOUBLE_PLAY', baseStateAfter: emptyBase })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'OUT',
        fielderChain: [8], outType: 'FLY' })

      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[0], inning: 1, result: 'OUT',
        fielderChain: [2], outType: 'FOUL' })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[1], inning: 1, result: 'SINGLE',
        baseStateAfter: base(homeSlotIds[1]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[2], inning: 1, result: 'OUT',
        fielderChain: [4, 6], outType: 'FORCE_OUT', baseStateAfter: base(homeSlotIds[2]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[3], inning: 1, result: 'OUT',
        fielderChain: [3], outType: 'FLY' })

      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 2, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[3]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 2, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[4], awaySlotIds[3]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 2, result: 'OUT',
        fielderChain: [5, 4, 3], outType: 'TRIPLE_PLAY', baseStateAfter: emptyBase })

      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[4], inning: 2, result: 'TRIPLE',
        baseStateAfter: base(null, null, homeSlotIds[4]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[5], inning: 2, result: 'OUT',
        fielderChain: [9], sacrificeType: 'FLY', baseStateAfter: emptyBase, runsScored: 1, rbi: 1 })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[6], inning: 2, result: 'SINGLE',
        baseStateAfter: base(homeSlotIds[6]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[7], inning: 2, result: 'OUT',
        fielderChain: [1, 3], sacrificeType: 'BUNT', baseStateAfter: base(null, homeSlotIds[6]) })
      await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[8], inning: 2, result: 'STRIKEOUT' })

      const sheet = await getSheet(bogenId)
      const allAbs = [...sheet.awayAtBats, ...sheet.homeAtBats]
      const outTypes = allAbs.map((a: { outType: string | null }) => a.outType).filter(Boolean)
      expect(outTypes).toContain('DOUBLE_PLAY')
      expect(outTypes).toContain('TRIPLE_PLAY')
      expect(outTypes).toContain('FLY')
      expect(outTypes).toContain('FOUL')
      expect(outTypes).toContain('FORCE_OUT')
      const sacTypes = allAbs.map((a: { sacrificeType: string | null }) => a.sacrificeType).filter(Boolean)
      expect(sacTypes).toContain('FLY')
      expect(sacTypes).toContain('BUNT')
      expect(sheet.meta.homeRuns).toBe(1)
      expect(sheet.meta.awayRuns).toBe(0)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('DP von 3 verschiedenen Slots + Chains', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-10-02', 'Charge', 'Shock', testInfo.parallelIndex)
    try {
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[0], inning: 1, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[0]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[1], inning: 1, result: 'OUT',
        fielderChain: [6, 4, 3], outType: 'DOUBLE_PLAY', baseStateAfter: emptyBase })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[2], inning: 1, result: 'STRIKEOUT' })
      for (let s = 0; s < 3; s++) {
        await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning: 1, result: 'STRIKEOUT' })
      }

      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[3], inning: 2, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[3]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[4], inning: 2, result: 'OUT',
        fielderChain: [4, 6, 3], outType: 'DOUBLE_PLAY', baseStateAfter: emptyBase })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[5], inning: 2, result: 'STRIKEOUT' })
      for (let s = 3; s < 6; s++) {
        await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning: 2, result: 'STRIKEOUT' })
      }

      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[6], inning: 3, result: 'SINGLE',
        baseStateAfter: base(awaySlotIds[6]) })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[7], inning: 3, result: 'OUT',
        fielderChain: [5, 4, 3], outType: 'DOUBLE_PLAY', baseStateAfter: emptyBase })
      await recordAtBat(bogenId, { side: 'AWAY', slotId: awaySlotIds[8], inning: 3, result: 'STRIKEOUT' })

      const sheet = await getSheet(bogenId)
      const dps = sheet.awayAtBats.filter((a: { outType: string }) => a.outType === 'DOUBLE_PLAY')
      expect(dps.length).toBe(3)
      const startFielders = dps.map((a: { fielderChain: number[] }) => a.fielderChain[0])
      expect(startFielders).toEqual([6, 4, 5])
      const slots = dps.map((a: { slotId: number }) => a.slotId)
      expect(new Set(slots).size).toBe(3)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })

  test('Fly-Outs F4..F9 von verschiedenen Positions', async ({ context }, testInfo) => {
    await seedAuth(context)
    const { bogenId, awaySlotIds, homeSlotIds } =
      await createSpielbogen('2099-10-03', 'Pop', 'Drift', testInfo.parallelIndex)
    try {
      const flyPositions = [4, 5, 6, 7, 8, 9]
      for (let i = 0; i < flyPositions.length; i++) {
        const inning = Math.floor(i / 3) + 1
        await recordAtBat(bogenId, {
          side: 'AWAY', slotId: awaySlotIds[i], inning,
          result: 'OUT', fielderChain: [flyPositions[i]], outType: 'FLY',
        })
      }
      for (let inning = 1; inning <= 2; inning++) {
        for (let s = 0; s < 3; s++) {
          await recordAtBat(bogenId, { side: 'HOME', slotId: homeSlotIds[s], inning, result: 'STRIKEOUT' })
        }
      }
      const sheet = await getSheet(bogenId)
      const flys = sheet.awayAtBats.filter((a: { outType: string }) => a.outType === 'FLY')
      expect(flys.length).toBe(6)
      const positions = flys.map((a: { fielderChain: number[] }) => a.fielderChain[0])
      expect(positions).toEqual(flyPositions)
    } finally {
      await deleteSpielbogen(bogenId).catch(() => {})
    }
  })
})
