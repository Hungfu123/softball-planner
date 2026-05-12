import { Drawer } from 'vaul'
import type { TrainingPlanContentResponse } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  onSave: (content: TrainingPlanContentResponse) => Promise<void>
}

export function PlanEditDrawer({ open, onClose, planContent, onSave }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Plan bearbeiten</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div
            className="px-4 py-4 space-y-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Plan bearbeiten
            </h2>

            <div className="bg-white border border-cream-300 rounded-xl p-4 text-sm text-navy-700">
              {planContent ? (
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(planContent, null, 2)}
                </pre>
              ) : (
                <p className="italic text-navy-500">Noch kein Plan vorhanden.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  if (planContent) {
                    await onSave(planContent)
                    onClose()
                  }
                }}
                disabled={!planContent}
                className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Speichern
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
