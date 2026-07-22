import { PlusCircle, TrashBin } from '@/icons'
import { Button } from '@/components/shared'
import type { InvitationContact } from '@/types'

interface Props {
  contacts: InvitationContact[]
  onChange: (contacts: InvitationContact[]) => void
}

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'

export function ContactEditor({ contacts, onChange }: Props) {
  const update = (index: number, patch: Partial<InvitationContact>) => {
    onChange(contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const addContact = () => {
    onChange([...contacts, { role: '', name: '', email: '', phone: '' }])
  }

  const removeContact = (index: number) => {
    onChange(contacts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-navy-700">Kontakt</h3>
        <Button type="button" variant="secondary" onClick={addContact} icon={<PlusCircle size={16} />}>
          Kontakt
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-center text-sm text-navy-400 italic py-4 border border-dashed border-cream-300 rounded-lg">
          Noch keine Kontakte.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c, i) => (
            // mobile: Karte (Rolle+Löschen, Name, Mail, Tel) · ab sm: eine Zeile
            <div
              key={i}
              className="rounded-xl border border-cream-300 bg-cream-50 p-2.5 space-y-2 sm:space-y-0 sm:p-0 sm:border-0 sm:bg-transparent sm:flex sm:items-center sm:gap-2"
            >
              <div className="flex items-center gap-2 sm:contents">
                <input
                  value={c.role}
                  onChange={e => update(i, { role: e.target.value })}
                  placeholder="Rolle"
                  className={`${inputCls} flex-1 font-semibold sm:flex-none sm:w-28 sm:order-1`}
                />
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  aria-label="Kontakt entfernen"
                  title="Entfernen"
                  className="ml-auto shrink-0 p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer sm:ml-0 sm:order-5"
                >
                  <TrashBin size={16} />
                </button>
              </div>
              <input
                value={c.name}
                onChange={e => update(i, { name: e.target.value })}
                placeholder="Name"
                className={`${inputCls} w-full sm:flex-1 sm:order-2`}
              />
              <input
                type="email"
                value={c.email}
                onChange={e => update(i, { email: e.target.value })}
                placeholder="E-Mail"
                className={`${inputCls} w-full sm:flex-1 sm:order-3`}
              />
              <input
                value={c.phone}
                onChange={e => update(i, { phone: e.target.value })}
                placeholder="Telefon"
                className={`${inputCls} w-full sm:flex-1 sm:order-4`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
