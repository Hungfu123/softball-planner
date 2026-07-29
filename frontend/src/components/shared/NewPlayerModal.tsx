import { useState } from 'react'
import { Button } from './Button'
import { ResponsiveSheet } from './ResponsiveSheet'

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

interface Props {
  voterName: string
  nested?: boolean
  onCancel: () => void
  onConfirm: (name: string) => void
}

export function NewPlayerModal({ voterName, nested, onCancel, onConfirm }: Props) {
  const [name, setName] = useState(voterName)

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Abbrechen
      </Button>
      <Button
        type="button"
        onClick={() => onConfirm(name.trim())}
        disabled={!name.trim()}
      >
        Anlegen
      </Button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onCancel} title="Neuer Spieler" maxWidth="sm" footer={footer} nested={nested}>
      <div className="p-5 space-y-3">
        <p className="text-sm text-gray-500">
          Legt einen neuen Spieler an und ordnet den WhatsApp-Wähler „{voterName}" zu.
        </p>
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus className={inputCls} />
        </div>
      </div>
    </ResponsiveSheet>
  )
}
