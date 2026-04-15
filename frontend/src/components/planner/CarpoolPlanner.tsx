import { useEffect, useState } from 'react'
import { useCarpool, freeSeats, computeSeatStatus } from '@/hooks/useCarpool'
import { useToastContext } from '@/components/layout/Layout'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { PlusCircle, TrashBin, XMark } from '@/icons'
import type { Player, CarResponse } from '@/types'
import { DIRECTION_LABELS } from '@/types'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

interface Props {
  gameDayId: number
  availablePlayers: Player[]
}

export function CarpoolPlanner({ gameDayId, availablePlayers }: Props) {
  const carpool = useCarpool()
  const toast = useToastContext()
  const [showAddCar, setShowAddCar] = useState(false)
  const [deleteCarId, setDeleteCarId] = useState<number | null>(null)

  const loadCars = carpool.load
  useEffect(() => { loadCars(gameDayId) }, [gameDayId, loadCars])

  const totalPlayers = availablePlayers.length

  // Seat status
  const thereStatus = computeSeatStatus(carpool.cars, totalPlayers, 'there')
  const backStatus = computeSeatStatus(carpool.cars, totalPlayers, 'back')

  // Has direction split?
  const hasDirectionSplit = carpool.cars.some(c => c.direction !== 'both')

  const handleDeleteCar = async () => {
    if (!deleteCarId) return
    try {
      await carpool.removeCar(deleteCarId)
      setDeleteCarId(null)
      toast.show('Auto entfernt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (carpool.loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      {carpool.cars.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-900">{totalPlayers} Spieler</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-600">{carpool.cars.length} {carpool.cars.length === 1 ? 'Auto' : 'Autos'}</span>
          </div>

          {!hasDirectionSplit ? (
            <SeatLine label="" status={thereStatus} />
          ) : (
            <div className="space-y-1">
              <SeatLine label="Hinweg" status={thereStatus} />
              <SeatLine label="Rückweg" status={backStatus} />
            </div>
          )}

          {carpool.cars.length < 3 && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <span>⚠</span>
              <span>Wenige Autos — klärt ab wer Schläger, Helme und Catcher-Ausrüstung mitnimmt</span>
            </div>
          )}
        </div>
      )}

      {/* Car List */}
      {carpool.cars.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-1">Noch keine Autos eingetragen.</p>
          <p className="text-sm text-gray-300 mb-4">Füge Autos hinzu um die Fahrten zu planen.</p>
          <button
            onClick={() => setShowAddCar(true)}
            className="px-5 py-3 text-sm font-semibold text-white bg-softball-red-600 rounded-xl hover:bg-softball-red-500 shadow-lg shadow-softball-red-600/20 cursor-pointer"
          >
            Auto hinzufügen
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {carpool.cars.map(car => (
              <CarCard
                key={car.id}
                car={car}
                onDelete={() => setDeleteCarId(car.id)}
              />
            ))}
          </div>

          <button
            onClick={() => setShowAddCar(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-softball-red-600 text-white hover:bg-softball-red-500 font-medium text-sm cursor-pointer"
          >
            <PlusCircle size={18} /> Auto hinzufügen
          </button>
        </>
      )}

      {/* Add Car Modal */}
      {showAddCar && (
        <AddCarModal
          availablePlayers={availablePlayers.filter(p => !carpool.cars.some(c => c.driver.id === p.id))}
          onAdd={async (driverPlayerId, totalSeats, direction) => {
            try {
              await carpool.addCar(gameDayId, driverPlayerId, totalSeats, direction)
              setShowAddCar(false)
              toast.show('Auto hinzugefügt')
            } catch (e: unknown) {
              toast.show((e as Error).message, 'error')
            }
          }}
          onClose={() => setShowAddCar(false)}
        />
      )}

      {deleteCarId && (
        <ConfirmModal
          title="Auto entfernen"
          message="Auto wirklich entfernen?"
          confirmLabel="Entfernen"
          onConfirm={handleDeleteCar}
          onCancel={() => setDeleteCarId(null)}
        />
      )}
    </div>
  )
}

// --- Seat Line ---
function SeatLine({ label, status }: { label: string; status: ReturnType<typeof computeSeatStatus> }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-gray-500 w-16">{label}:</span>}
      <span className={`font-medium ${status.ok ? 'text-emerald-600' : 'text-softball-red-600'}`}>
        {status.ok ? '✓' : '✗'}
      </span>
      <span className="text-gray-600">
        {status.totalCapacity} {status.totalCapacity === 1 ? 'Platz' : 'Plätze'} für {status.needed} Mitfahrer
      </span>
      {status.ok ? (
        <span className="text-emerald-600 text-xs">({status.free} frei)</span>
      ) : (
        <span className="text-softball-red-600 text-xs">({Math.abs(status.free)} fehlen)</span>
      )}
    </div>
  )
}

// --- Car Card ---
function CarCard({ car, onDelete }: {
  car: CarResponse
  onDelete: () => void
}) {
  const free = freeSeats(car)

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">🚗</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{car.driver.name}</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-600">{car.totalSeats} Plätze</span>
          {car.direction !== 'both' && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                {DIRECTION_LABELS[car.direction]}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${free > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {free} frei
        </span>
        <button
          onClick={onDelete}
          className="p-1 rounded text-gray-300 hover:text-softball-red-500 transition-colors cursor-pointer"
          title="Auto entfernen"
        >
          <TrashBin size={14} />
        </button>
      </div>
    </div>
  )
}

// --- Add Car Modal ---
function AddCarModal({ availablePlayers, onAdd, onClose }: {
  availablePlayers: Player[]
  onAdd: (driverPlayerId: number, totalSeats: number, direction: string) => void
  onClose: () => void
}) {
  const [driverId, setDriverId] = useState<number | ''>('')
  const [seats, setSeats] = useState(5)
  const [direction, setDirection] = useState('both')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Auto hinzufügen</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <XMark size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fahrer</label>
            <select
              value={driverId}
              onChange={e => setDriverId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            >
              <option value="">— wählen —</option>
              {availablePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plätze gesamt <span className="font-normal text-gray-400">(inkl. Fahrer)</span></label>
            <input
              type="number"
              min={2}
              max={9}
              value={seats}
              onChange={e => setSeats(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Richtung</label>
            <div className="space-y-2">
              {(['both', 'there', 'back'] as const).map(dir => (
                <label key={dir} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={dir}
                    checked={direction === dir}
                    onChange={() => setDirection(dir)}
                    className="accent-navy-600"
                  />
                  <span className="text-sm text-gray-700">{DIRECTION_LABELS[dir]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={() => driverId && onAdd(driverId as number, seats, direction)}
            disabled={!driverId}
            className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50 cursor-pointer"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
