import type { BogenSide } from '@/types'

interface Props {
  currentSide: BogenSide
  outs: number
  homeTeamName: string
  awayTeamName: string
  onSwitchSide: () => void
  disabled?: boolean
}

export function BogenSideToggle({ currentSide, homeTeamName, awayTeamName, onSwitchSide, disabled }: Props) {
  const battingTeam = currentSide === 'HOME' ? homeTeamName : awayTeamName
  return (
    <div className="flex items-center justify-center gap-1 p-2 bg-cream-100 border-b border-cream-300">
      <div className="flex rounded-full border border-cream-300 bg-white overflow-hidden shadow-sm">
        <button
          onClick={currentSide !== 'HOME' ? onSwitchSide : undefined}
          disabled={disabled || currentSide === 'HOME'}
          className={`font-display px-5 py-1.5 text-xs font-bold tracking-widest rounded-full uppercase transition-colors cursor-pointer
            ${currentSide === 'HOME'
              ? 'bg-navy-800 text-white'
              : 'text-navy-600 hover:bg-navy-100 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
        >
          Heim
        </button>
        <button
          onClick={currentSide !== 'AWAY' ? onSwitchSide : undefined}
          disabled={disabled || currentSide === 'AWAY'}
          className={`font-display px-5 py-1.5 text-xs font-bold tracking-widest rounded-full uppercase transition-colors cursor-pointer
            ${currentSide === 'AWAY'
              ? 'bg-softball-red-600 text-white'
              : 'text-softball-red-700 hover:bg-softball-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
        >
          Gast
        </button>
      </div>
      <span className="text-xs text-gray-500 font-body ml-2 truncate">
        <span className="font-semibold text-navy-800">{battingTeam}</span> schlägt
      </span>
    </div>
  )
}
