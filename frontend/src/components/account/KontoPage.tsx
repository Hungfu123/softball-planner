import { useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { useToastContext } from '@/components/layout/Layout'
import { Button, Card, Abschnittsmarke } from '@/components/shared'
import { changePassword, changeUsername, setAuth, storedCredentials } from '@/api/client'

const inputCls =
  'w-full border border-line rounded-lg px-3 py-2 min-h-11 text-sm text-ink-strong bg-surface-sunken focus:bg-surface-raised focus:border-line-strong focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-label mb-1'

const MIN_LAENGE = 8

function Fehler({ text }: { text: string | null }) {
  if (!text) return null
  return <p role="alert" className="text-sm text-softball-red-700">{text}</p>
}

function NamenFormular() {
  const { me, neuLaden } = useAuth()
  const toast = useToastContext()
  // null = noch nicht getippt: das Feld zeigt dann den aktuellen Namen, auch wenn `me` erst später eintrifft.
  const [eingabe, setEingabe] = useState<string | null>(null)
  const name = eingabe ?? me?.username ?? ''
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
      if (alt) {
        setAuth(neu.username, alt.password)
        await neuLaden()
        toast.show('Benutzername geändert')
      } else {
        // Nichts neu abzulegen heißt: die nächste Anfrage liefe mit dem alten Namen ins 401. Lieber laut.
        setFehler('Der Name wurde geändert, aber die Anmeldung kann nicht fortgeführt werden. Bitte melde dich mit dem neuen Namen neu an.')
      }
    } catch (err) {
      setFehler((err as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-3">
      <div>
        {/* Die Karte darüber heißt schon „Benutzername" — zweimal dasselbe Wort untereinander
            ist Lärm. Für Screenreader bleibt die Beschriftung, sie ist der Name des Feldes. */}
        <label htmlFor="konto-benutzername" className="sr-only">Benutzername</label>
        <input id="konto-benutzername" value={name} onChange={e => setEingabe(e.target.value)} autoComplete="username" className={inputCls} />
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

/**
 * Hell oder dunkel. Gilt nur auf diesem Gerät — wer das Handy abends dunkel will und den
 * Laptop tagsüber hell, soll sich nicht zwischen beidem entscheiden müssen.
 */
function ThemeWahl() {
  const { theme, setTheme } = useTheme()
  const knopf = (wert: 'light' | 'dark', text: string) => (
    <button
      type="button"
      onClick={() => setTheme(wert)}
      aria-pressed={theme === wert}
      className={`min-h-11 flex-1 rounded-lg border px-4 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
        theme === wert
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface-raised text-ink hover:border-line-strong'
      }`}
    >
      {text}
    </button>
  )
  return (
    <div>
      <div role="group" aria-label="Ansicht" className="flex gap-2">
        {knopf('light', 'Hell')}
        {knopf('dark', 'Dunkel')}
      </div>
      <p className="mt-2 text-xs text-ink-faint">Gilt nur auf diesem Gerät.</p>
    </div>
  )
}

/** Das eigene Konto: Benutzername und Passwort, für jede Rolle. */
export function KontoPage() {
  const { me } = useAuth()
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="inline-flex items-center gap-2.5 font-headline text-2xl sm:text-3xl font-extrabold text-ink-strong tracking-wide uppercase"><Abschnittsmarke size="lg" />Konto & Passwort</h1>

      {me && me.passwordChanged === false && (
        <div role="status" className="rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-3 text-sm text-ink">
          Du meldest dich noch mit dem Startpasswort an, das alle bekommen haben. Setz unten ein eigenes —
          dann kann niemand sonst als du auftreten.
        </div>
      )}

      <Card padding="lg">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-ink-strong mb-3">Benutzername</h2>
        <NamenFormular />
      </Card>

      <Card padding="lg">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-ink-strong mb-3">Passwort</h2>
        <PasswortFormular />
      </Card>

      <Card padding="lg">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-ink-strong mb-3">Ansicht</h2>
        <ThemeWahl />
      </Card>
    </div>
  )
}
