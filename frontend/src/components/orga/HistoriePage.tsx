import { useEffect, useState, type ReactNode } from 'react'
import { Badge, Button, Card, EmptyState, LoadingSkeleton, Abschnittsmarke } from '@/components/shared'
import { CrossBones } from '@/icons'
import { getAudit, getLastSeen } from '@/api/client'
import type { AuditEntry, AuditKind, LastSeen, Role } from '@/types'

const ROLLEN: Record<Role, string> = { PLAYER: 'Spieler', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' }
const ART: Record<AuditKind, { text: string; color: 'navy' | 'gray' | 'red' | 'amber' }> = {
  LOGIN: { text: 'Anmeldung', color: 'navy' },
  LOGIN_FAILED: { text: 'Anmeldung gescheitert', color: 'red' },
  WRITE: { text: 'Änderung', color: 'gray' },
  SCORING: { text: 'Scoring', color: 'amber' },
}

const TAG = 86400_000
const inputCls =
  'border border-cream-300 rounded-lg px-3 min-h-11 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

const datumZeit = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const tagKopf = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const uhrzeit = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

const tagSchluessel = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** yyyy-mm-dd im Ortszeit-Kalender, so wie <input type="date"> es liefert. */
function datumswert(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Zeitraum = '1' | '7' | '30' | 'eigen'

/** Vorgabe sind die letzten sieben Tage: der Verlauf hat keine Seitenbildung, "alles" wären Tausende Zeilen. */
function zeitfenster(zeitraum: Zeitraum, von: string, bis: string): { from?: string; to?: string } {
  if (zeitraum !== 'eigen') return { from: new Date(Date.now() - Number(zeitraum) * TAG).toISOString() }
  return {
    from: von ? new Date(`${von}T00:00:00`).toISOString() : undefined,
    to: bis ? new Date(`${bis}T23:59:59.999`).toISOString() : undefined,
  }
}

/**
 * Der Spieler hinter dem Benutzernamen — aber nur, wenn er etwas Neues sagt. „seb" und „Seb"
 * nebeneinander wäre Lärm; „ballermann99 · Seb" ist der Fall, für den die Spalte existiert.
 * Wer sich umbenennt, bleibt damit zuordenbar, und alte Zeilen unter dem alten Namen ebenso:
 * aufgelöst wird über die userId, nicht über den Namen im Ereignis.
 */
function fremderName(username: string, playerName: string | null): string | null {
  if (!playerName) return null
  return playerName.toLowerCase() === username.toLowerCase() ? null : playerName
}

function ZuletztGesehen({ liste }: { liste: LastSeen[] }) {
  return (
    <Card>
      <ul aria-label="Zuletzt gesehen">
        {liste.map(l => (
          <li key={l.userId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 min-h-11 border-b border-cream-300 last:border-b-0">
            <span className="flex-1 min-w-32 break-words">
              <span className="font-semibold text-navy-900">{l.username}</span>
              {fremderName(l.username, l.playerName) && (
                <span className="text-sm text-gray-500"> · {fremderName(l.username, l.playerName)}</span>
              )}
            </span>
            <span className="text-xs text-gray-500">{ROLLEN[l.role]}</span>
            <span className="text-sm text-gray-700 tabular-nums">
              {l.lastSeenAt ? `zuletzt gesehen ${datumZeit.format(new Date(l.lastSeenAt))}` : 'noch nie gesehen'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Zeitangabe({ e }: { e: AuditEntry }) {
  const von = uhrzeit.format(new Date(e.from))
  const bis = uhrzeit.format(new Date(e.to))
  // Eine Spanne zeigt ihr Fenster, eine Einzelzeile nur den Zeitpunkt.
  return <span className="tabular-nums text-xs text-gray-500 w-24 shrink-0">{e.count > 1 && von !== bis ? `${von}–${bis}` : von}</span>
}

function Verlauf({ eintraege }: { eintraege: AuditEntry[] }) {
  return (
    <Card>
      <ul aria-label="Verlauf">
        {eintraege.map((e, i) => {
          const neuerTag = i === 0 || tagSchluessel(e.to) !== tagSchluessel(eintraege[i - 1].to)
          return (
            <FragmentZeile key={`${e.username}-${e.from}-${i}`} kopf={neuerTag ? tagKopf.format(new Date(e.to)) : null}>
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 min-h-11 border-b border-cream-300 last:border-b-0">
                <Zeitangabe e={e} />
                <span className="min-w-20">
                  <span className="font-semibold text-navy-900">{e.username}</span>
                  {fremderName(e.username, e.playerName) && (
                    <span className="text-xs text-gray-500"> · {fremderName(e.username, e.playerName)}</span>
                  )}
                </span>
                <span className="flex-1 min-w-40 text-sm text-gray-700 break-words">{e.label}</span>
                <Badge color={ART[e.kind].color} size="sm">{ART[e.kind].text}</Badge>
              </li>
            </FragmentZeile>
          )
        })}
      </ul>
    </Card>
  )
}

/** Tageskopf als Trennzeile: kein listitem, damit eine Zeile genau ein Ereignis (oder eine Spanne) bleibt. */
function FragmentZeile({ kopf, children }: { kopf: string | null; children: ReactNode }) {
  return (
    <>
      {kopf && <li role="presentation" className="px-4 py-2 bg-cream-100 border-b border-cream-300 text-xs font-bold uppercase tracking-wide text-navy-500">{kopf}</li>}
      {children}
    </>
  )
}

/**
 * Wie viele Zeilen auf einmal. Der Verlauf hat serverseitig keine Seitenbildung — die Spannen
 * entstehen erst beim Lesen aus aufeinanderfolgenden Zeilen, eine Grenze in der Abfrage würde sie
 * mitten durchschneiden. Also kommt der Zeitraum vollständig und die Seite zeigt ihn in Häppchen.
 */
const SEITE = 50

/** Nur für Superadmins: wer zuletzt da war und was wer getan hat. */
export function HistoriePage() {
  const [gesehen, setGesehen] = useState<LastSeen[] | null>(null)
  const [gesehenFehler, setGesehenFehler] = useState<string | null>(null)
  const [nutzer, setNutzer] = useState('')
  const [zeitraum, setZeitraum] = useState<Zeitraum>('7')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  // '' heißt alle Arten.
  const [art, setArt] = useState<'' | 'LOGIN' | 'LOGIN_FAILED' | 'WRITE' | 'SCORING'>('')
  // Die Antwort trägt den Schlüssel der Anfrage, zu der sie gehört: passt er nicht mehr zu den
  // Filtern, lädt die Seite noch — und eine späte Antwort auf einen alten Filter zeigt sich nie.
  const anfrage = `${nutzer}|${zeitraum}|${von}|${bis}|${art}`
  // Wie die Antwort traegt auch die Sicht den Schluessel ihrer Anfrage: andere Filter, andere
  // Liste — dann faengt sie wieder bei SEITE an, ohne dass ein Effekt sie zuruecksetzen muss.
  const [sicht, setSicht] = useState({ anfrage, n: SEITE })
  const [antwort, setAntwort] = useState<{ anfrage: string; liste: AuditEntry[] | null; fehler: string | null } | null>(null)

  useEffect(() => {
    getLastSeen().then(setGesehen).catch(e => setGesehenFehler((e as Error).message))
  }, [])

  useEffect(() => {
    let aktiv = true
    getAudit({ userId: nutzer ? Number(nutzer) : undefined, kind: art || undefined, ...zeitfenster(zeitraum, von, bis) })
      .then(liste => { if (aktiv) setAntwort({ anfrage, liste, fehler: null }) })
      .catch(e => { if (aktiv) setAntwort({ anfrage, liste: null, fehler: (e as Error).message }) })
    return () => { aktiv = false }
  }, [anfrage, nutzer, zeitraum, von, bis, art])

  const sichtbar = sicht.anfrage === anfrage ? sicht.n : SEITE

  const aktuell = antwort?.anfrage === anfrage ? antwort : null
  const verlauf = aktuell?.liste ?? null
  const fehler = aktuell?.fehler ?? null

  const zeitraumWechseln = (neu: Zeitraum) => {
    if (neu === 'eigen' && !von) {
      setVon(datumswert(Date.now() - 7 * TAG))
      setBis(datumswert(Date.now()))
    }
    setZeitraum(neu)
  }

  return (
    <div className="space-y-4">
      <h1 className="inline-flex items-center gap-2.5 font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase"><Abschnittsmarke size="lg" />Historie</h1>

      <div role="note" className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-navy-900">
        Zeigt das Konto, nicht die Person: Passwörter sind geteilt, und ein Admin kann das eines anderen
        zurücksetzen. Hinweis, kein Beweis.
      </div>

      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Zuletzt gesehen</h2>
      {gesehenFehler && <p role="alert" className="text-sm text-softball-red-700">{gesehenFehler}</p>}
      {gesehen && <ZuletztGesehen liste={gesehen} />}

      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Verlauf</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="historie-nutzer" className={labelCls}>Nutzer</label>
          <select id="historie-nutzer" value={nutzer} onChange={e => setNutzer(e.target.value)} className={inputCls}>
            <option value="">Alle</option>
            {(gesehen ?? []).map(g => <option key={g.userId} value={g.userId}>{g.username}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="historie-art" className={labelCls}>Aktivität</label>
          <select id="historie-art" value={art} onChange={e => setArt(e.target.value as typeof art)} className={inputCls}>
            <option value="">Alle</option>
            <option value="LOGIN">Anmeldungen</option>
            <option value="LOGIN_FAILED">Gescheiterte Anmeldungen</option>
            <option value="WRITE">Änderungen</option>
            <option value="SCORING">Scoring</option>
          </select>
        </div>
        <div>
          <label htmlFor="historie-zeitraum" className={labelCls}>Zeitraum</label>
          <select id="historie-zeitraum" value={zeitraum} onChange={e => zeitraumWechseln(e.target.value as Zeitraum)} className={inputCls}>
            <option value="1">Letzte 24 Stunden</option>
            <option value="7">Letzte 7 Tage</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="eigen">Eigener Zeitraum</option>
          </select>
        </div>
        {zeitraum === 'eigen' && (
          <>
            <div>
              <label htmlFor="historie-von" className={labelCls}>Von</label>
              <input id="historie-von" type="date" value={von} max={bis || undefined} onChange={e => setVon(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="historie-bis" className={labelCls}>Bis</label>
              <input id="historie-bis" type="date" value={bis} min={von || undefined} onChange={e => setBis(e.target.value)} className={inputCls} />
            </div>
          </>
        )}
      </div>

      {fehler && <p role="alert" className="text-sm text-softball-red-700">Der Verlauf konnte nicht geladen werden: {fehler}</p>}
      {!fehler && verlauf === null && <LoadingSkeleton />}
      {verlauf && verlauf.length === 0 && (
        <EmptyState
          icon={<CrossBones size={40} />}
          title="Im gewählten Zeitraum ist nichts passiert."
          description="Wähle einen größeren Zeitraum, eine andere Aktivität oder einen anderen Nutzer — Anmeldungen und Änderungen erscheinen hier, sobald jemand etwas tut."
        />
      )}
      {verlauf && verlauf.length > 0 && (
        <>
          <Verlauf eintraege={verlauf.slice(0, sichtbar)} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 tabular-nums">
              {Math.min(sichtbar, verlauf.length)} von {verlauf.length} {verlauf.length === 1 ? 'Eintrag' : 'Einträgen'}
            </p>
            {verlauf.length > sichtbar && (
              <Button variant="secondary" onClick={() => setSicht({ anfrage, n: sichtbar + SEITE })}>
                Mehr anzeigen
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default HistoriePage
