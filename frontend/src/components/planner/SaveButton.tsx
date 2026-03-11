interface Props {
  hasChanges: boolean
  saving: boolean
  onSave: () => void
  className?: string
}

export function SaveButton({ hasChanges, saving, onSave, className = '' }: Props) {
  if (!hasChanges) return null

  return (
    <div className={className}>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 text-sm font-semibold text-white bg-softball-red-600 rounded-xl hover:bg-softball-red-500 disabled:opacity-50 shadow-lg shadow-softball-red-600/20"
      >
        {saving ? 'Speichern...' : 'Lineup speichern'}
      </button>
    </div>
  )
}
