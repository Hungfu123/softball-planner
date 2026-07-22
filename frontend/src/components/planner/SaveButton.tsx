import { Button } from '@/components/shared'

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
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-3 rounded-xl text-navy-700 font-semibold"
          >
            Abbrechen
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold shadow-lg shadow-softball-red-600/20"
        >
          {saving ? 'Speichern...' : 'Lineup speichern'}
        </Button>
      </div>
    </div>
  )
}
