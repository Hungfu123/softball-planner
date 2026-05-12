interface Props {
  hasChanges: boolean
  saving: boolean
  onSave: () => void
  onCancel?: () => void
  className?: string
}

export function SaveButton({ hasChanges, saving, onSave, onCancel, className = '' }: Props) {
  if (!hasChanges) return null

  return (
    <div className={className}>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-3 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-xl hover:bg-cream-100 disabled:opacity-50 cursor-pointer"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="py-3 text-sm font-semibold text-white bg-softball-red-600 rounded-xl hover:bg-softball-red-500 disabled:opacity-50 shadow-lg shadow-softball-red-600/20 cursor-pointer"
        >
          {saving ? 'Speichern...' : 'Lineup speichern'}
        </button>
      </div>
    </div>
  )
}
