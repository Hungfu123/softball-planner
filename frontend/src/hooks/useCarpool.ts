import { useState, useCallback } from 'react'
import type { CarResponse } from '@/types'
import * as api from '@/api/client'

export function useCarpool() {
  const [cars, setCars] = useState<CarResponse[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (gameDayId: number) => {
    setLoading(true)
    try {
      setCars(await api.getCars(gameDayId))
    } finally {
      setLoading(false)
    }
  }, [])

  const addCar = async (gameDayId: number, driverPlayerId: number, totalSeats: number, direction: string) => {
    const car = await api.createCar(gameDayId, { driverPlayerId, totalSeats, direction })
    setCars(prev => [...prev, car])
    return car
  }

  const removeCar = async (carId: number) => {
    await api.deleteCar(carId)
    setCars(prev => prev.filter(c => c.id !== carId))
  }

  return { cars, loading, load, addCar, removeCar }
}

// Helper: free passenger seats for a car
export function freeSeats(car: CarResponse): number {
  return car.totalSeats - 1
}

// Helper: compute seat totals for a direction
export function computeSeatStatus(cars: CarResponse[], totalPlayers: number, direction: 'there' | 'back') {
  const relevant = cars.filter(c => c.direction === 'both' || c.direction === direction)
  let totalCapacity = 0
  for (const car of relevant) {
    totalCapacity += car.totalSeats - 1
  }
  const driverIds = new Set(relevant.map(c => c.driver.id))
  const needed = totalPlayers - driverIds.size
  return {
    totalCapacity,
    needed,
    free: totalCapacity - needed,
    ok: totalCapacity >= needed,
  }
}
