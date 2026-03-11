import { XMark, AlertTriangle } from '@/icons'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, message, confirmLabel = 'Löschen', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-5 flex items-start gap-3">
          <AlertTriangle size={24} className="text-softball-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
