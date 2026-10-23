import { useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToastContext } from '@/components/layout/Layout'
import { Button, Card } from '@/components/shared'
import { changePassword, changeUsername, setAuth, storedCredentials } from '@/api/client'

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 min-h-11 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

const MIN_LAENGE = 8

function Fehler({ text }: { text: string | null }) {
  if (!text) return null
  return <p role="alert" className="text-sm text-softball-red-700">{text}</p>
}

function NamenFormular() {
  const { me, neuLaden } = useAuth()
  const toast = useToastContext()
  const [name, setName] = useState(me?.username ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const speichern = async (e: FormEvent) => {
    e.preventDefault()
    setFehler(null)
    setLaeuft(true)
    try {
      const neu = await changeUsername(name.trim())
      // Die Basic-Anmeldedaten tragen den alten Namen: ohne den Tausch lehnte der Server die nächste Anfrage ab.
      const alt = storedCredentials()
      if (alt) setAuth(neu.username, alt.password)
      await neuLaden()
      toast.show('Benutzername geändert')
    } catch (err) {
      setFehler((err as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-3">
      <div>
        <label htmlFor="konto-benutzername" className={labelCls}>Benutzername</label>
        <input id="konto-benutzername" value={name} onChange={e => setName(e.target.value)} autoComplete="username" className={inputCls} />
      </div>
      <Fehler text={fehler} />
      <Button type="submit" variant="navy" className="min-h-11" disabled={laeuft || name.trim() === '' || name.trim() === me?.username}>
        Namen speichern
      </Button>
    </form>
  )
}

function PasswortFormular() {
  const { me, neuLaden } = useAuth()
  const toast = useToastContext()
  const [aktuell, setAktuell] = useState('')
  const [neu, setNeu] = useState('')
  const [wiederholt, setWiederholt] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const speichern = async (e: FormEvent) => {
    e.preventDefault()
    setFehler(null)
    if (neu.length < MIN_LAENGE) return setFehler(`Das neue Passwort braucht mindestens ${MIN_LAENGE} Zeichen.`)
    if (neu !== wiederholt) return setFehler('Neues Passwort und Wiederholung stimmen nicht überein.')
    setLaeuft(true)
    try {
      const auskunft = await changePassword(aktuell, neu)
      setAuth(auskunft.username ?? me?.username ?? '', neu)
      await neuLaden()
      setAktuell('')
      setNeu('')
      setWiederholt('')
      toast.show('Passwort geändert')
    } catch (err) {
      setFehler((err as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-3">
      <div>
        <label htmlFor="konto-aktuell" className={labelCls}>Aktuelles Passwort</label>
        <input id="konto-aktuell" type="password" value={aktuell} onChange={e => setAktuell(e.target.value)} autoComplete="current-password" className={inputCls} />
      </div>
      <div>
        <label htmlFor="konto-neu" className={labelCls}>Neues Passwort</label>
        <input id="konto-neu" type="password" value={neu} onChange={e => setNeu(e.target.value)} autoComplete="new-password" className={inputCls} />
      </div>
      <div>
        <label htmlFor="konto-wiederholt" className={labelCls}>Neues Passwort wiederholen</label>
        <input id="konto-wiederholt" type="password" value={wiederholt} onChange={e => setWiederholt(e.target.value)} autoComplete="new-password" className={inputCls} />
      </div>
      <Fehler text={fehler} />
      <Button type="submit" variant="navy" className="min-h-11" disabled={laeuft || aktuell === ''}>
        Passwort ändern
      </Button>
    </form>
  )
}

/** Das eigene Konto: Benutzername und Passwort, für jede Rolle. */
export function KontoPage() {
  const { me } = useAuth()
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Konto & Passwort</h1>

      {me && me.passwordChanged === false && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-navy-900">
          Du meldest dich noch mit dem Startpasswort an, das alle bekommen haben. Setz unten ein eigenes —
          dann kann niemand sonst als du auftreten.
        </div>
      )}

      <Card padding="lg">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900 mb-3">Benutzername</h2>
        <NamenFormular />
      </Card>

      <Card padding="lg">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900 mb-3">Passwort</h2>
        <PasswortFormular />
      </Card>
    </div>
  )
}
