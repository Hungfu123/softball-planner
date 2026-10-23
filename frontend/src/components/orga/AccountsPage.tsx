import { useCallback, useEffect, useState } from 'react'
import { useRolle } from '@/hooks/useRolle'
import { useToastContext } from '@/components/layout/Layout'
import { Badge, Button, Card, ConfirmModal, EmptyState, LoadingSkeleton } from '@/components/shared'
import { CrossBones, TrashBin } from '@/icons'
import {
  bulkCreateUsers, createUser, deleteUser, getPlayers, getUsers,
  resetUserPassword, setUserLocked, setUserMayScore, setUserRole,
} from '@/api/client'
import type { BulkCreateResult, Player, Role, UserAccount } from '@/types'
import { AnkuendigungModal } from './AnkuendigungModal'

const ROLLEN: Record<Role, string> = { PLAYER: 'Spieler', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' }

type Dialog =
  | { art: 'loeschen'; konto: UserAccount }
  | { art: 'zuruecksetzen'; konto: UserAccount }
  | { art: 'massenanlage' }

/** Eine Zeile je Spieler, dazu Accounts ohne Spieler (z. B. der Superadmin) am Ende. */
interface Eintrag {
  name: string
  konto: UserAccount | null
  player: Player | null
}

function eintraege(players: Player[], users: UserAccount[]): Eintrag[] {
  const nachSpieler = new Map(users.filter(u => u.playerId !== null).map(u => [u.playerId, u]))
  const mitSpieler = players.map(p => ({ name: p.name, player: p, konto: nachSpieler.get(p.id) ?? null }))
  const bekannt = new Set(players.map(p => p.id))
  // Ein Account an einem archivierten Spieler gehört trotzdem in die Liste — sonst wäre er unverwaltbar.
  const uebrige = users
    .filter(u => u.playerId === null || !bekannt.has(u.playerId))
    .map(u => ({ name: u.playerName ?? u.username, player: null, konto: u }))
  return [...mitSpieler, ...uebrige]
}

const REVEAL = 'flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity'
const KLEIN = 'min-h-11 min-w-11 px-3 text-xs font-semibold text-navy-900 rounded-lg hover:bg-navy-800 hover:text-white transition-colors cursor-pointer'

function KontoZeile({ eintrag, istSuperadmin, onAnlegen, onRolle, onScorer, onSperre, onDialog }: {
  eintrag: Eintrag
  istSuperadmin: boolean
  onAnlegen: (player: Player) => void
  onRolle: (k: UserAccount, rolle: Role) => void
  onScorer: (k: UserAccount, darf: boolean) => void
  onSperre: (k: UserAccount, gesperrt: boolean) => void
  onDialog: (d: Dialog) => void
}) {
  const { konto, player, name } = eintrag
  return (
    <li aria-label={name} className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 min-h-14 border-b border-cream-300 last:border-b-0">
      <div className="flex-1 min-w-40">
        <div className="font-semibold text-navy-900 break-words">{name}</div>
        {konto ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{konto.username}</span>
            {konto.locked && <Badge color="red">Gesperrt</Badge>}
            {!konto.passwordChanged && <Badge color="amber">Startpasswort</Badge>}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Noch kein Account — der Spieler kann sich nicht anmelden.</div>
        )}
      </div>

      {konto ? (
        <>
          {istSuperadmin ? (
            <select
              aria-label="Rolle"
              value={konto.role}
              onChange={e => onRolle(konto, e.target.value as Role)}
              className="min-h-11 border border-cream-300 rounded-lg px-2 text-sm text-navy-900 bg-cream-100"
            >
              {(Object.keys(ROLLEN) as Role[]).map(r => <option key={r} value={r}>{ROLLEN[r]}</option>)}
            </select>
          ) : (
            <span className="text-sm text-gray-600">{ROLLEN[konto.role]}</span>
          )}
          <label className="flex items-center gap-2 min-h-11 text-sm text-navy-900 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Darf scoren"
              checked={konto.mayScore}
              onChange={e => onScorer(konto, e.target.checked)}
              className="accent-navy-700 w-5 h-5 cursor-pointer"
            />
            Scorer
          </label>
          <div className={REVEAL}>
            <button type="button" className={KLEIN} onClick={() => onDialog({ art: 'zuruecksetzen', konto })}>
              Passwort zurücksetzen
            </button>
            <button type="button" className={KLEIN} onClick={() => onSperre(konto, !konto.locked)}>
              {konto.locked ? 'Entsperren' : 'Sperren'}
            </button>
            <button
              type="button"
              aria-label="Account löschen"
              className={`${KLEIN} flex items-center justify-center hover:!bg-softball-red-600`}
              onClick={() => onDialog({ art: 'loeschen', konto })}
            >
              <TrashBin size={16} />
            </button>
          </div>
        </>
      ) : (
        player && (
          <Button variant="secondary" className="min-h-11" onClick={() => onAnlegen(player)}>Account anlegen</Button>
        )
      )}
    </li>
  )
}

function Massenbericht({ ergebnis, onClose }: { ergebnis: BulkCreateResult; onClose: () => void }) {
  return (
    <section aria-label="Ergebnis der Massenanlage" className="rounded-2xl border border-cream-300 bg-cream-50 p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">
          {ergebnis.created.length} angelegt, {ergebnis.skipped.length} übersprungen
        </h2>
        <Button variant="ghost" className="min-h-11" onClick={onClose}>Schließen</Button>
      </div>
      {ergebnis.created.length > 0 && (
        <ul className="text-sm text-gray-700 space-y-0.5">
          {ergebnis.created.map(c => <li key={c.accountId}>{c.playerName} als {c.username}</li>)}
        </ul>
      )}
      {ergebnis.skipped.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-500 mb-1">Übersprungen — hier bitte von Hand weiter</p>
          <ul className="text-sm text-gray-700 space-y-0.5">
            {ergebnis.skipped.map(s => <li key={s.playerId}><strong>{s.playerName}:</strong> {s.reason}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Accountverwaltung für Admins. Die Rollenwahl gibt es nur für Superadmins — verboten ist sie dem Admin im Backend. */
export function AccountsPage() {
  const { me } = useRolle()
  // Streng: ohne Auskunft (me === null) keine Rollenwahl — hier ist Verstecken die sichere Richtung.
  const istSuperadmin = me?.role === 'SUPERADMIN'
  const toast = useToastContext()
  const [players, setPlayers] = useState<Player[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [bericht, setBericht] = useState<BulkCreateResult | null>(null)

  const laden = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([getPlayers(), getUsers()])
      setPlayers(p)
      setUsers(u)
      setFehler(null)
    } catch (e) {
      setFehler((e as Error).message)
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => { void laden() }, [laden])

  const ersetzen = (neu: UserAccount) => setUsers(us => us.map(u => (u.id === neu.id ? neu : u)))

  /** Jede Änderung: Server fragen, Antwort einsetzen, Fehler als Toast. */
  const ausfuehren = async (aktion: () => Promise<void>, erfolg?: string) => {
    try {
      await aktion()
      if (erfolg) toast.show(erfolg)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const ohneAccount = eintraege(players, users).filter(e => e.konto === null && e.player !== null).length

  const bestaetigt = async () => {
    const d = dialog
    setDialog(null)
    if (!d) return
    if (d.art === 'loeschen') {
      await ausfuehren(async () => {
        await deleteUser(d.konto.id)
        setUsers(us => us.filter(u => u.id !== d.konto.id))
      }, 'Account gelöscht')
    } else if (d.art === 'zuruecksetzen') {
      await ausfuehren(async () => ersetzen(await resetUserPassword(d.konto.id)), 'Passwort zurückgesetzt')
    } else {
      await ausfuehren(async () => {
        setBericht(await bulkCreateUsers())
        await laden()
      })
    }
  }

  if (laedt) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Accounts</h1>
        {ohneAccount > 0 && (
          <Button variant="navy" className="min-h-11" onClick={() => setDialog({ art: 'massenanlage' })}>
            Accounts für alle aktiven Spieler anlegen
          </Button>
        )}
      </div>

      {fehler && (
        <div role="alert" className="rounded-xl border border-softball-red-300 bg-softball-red-50 px-4 py-3 text-sm text-softball-red-700 flex items-center justify-between gap-3">
          <span>Die Accounts konnten nicht geladen werden: {fehler}</span>
          <Button variant="secondary" className="min-h-11" onClick={() => void laden()}>Nochmal versuchen</Button>
        </div>
      )}

      {bericht && <Massenbericht ergebnis={bericht} onClose={() => setBericht(null)} />}

      {!fehler && players.length === 0 && users.length === 0 ? (
        <EmptyState
          icon={<CrossBones size={40} />}
          title="Noch keine Spieler im Kader"
          description="Legt zuerst Spieler an — dann lässt sich hier für jeden ein Account erzeugen."
        />
      ) : (
        <Card>
          <ul aria-label="Accounts">
            {eintraege(players, users).map(e => (
              <KontoZeile
                key={e.konto ? `k${e.konto.id}` : `p${e.player?.id}`}
                eintrag={e}
                istSuperadmin={istSuperadmin}
                onAnlegen={p => void ausfuehren(async () => {
                  const neu = await createUser(p.id)
                  setUsers(us => [...us, neu])
                }, 'Account angelegt')}
                onRolle={(k, rolle) => void ausfuehren(async () => ersetzen(await setUserRole(k.id, rolle)), 'Rolle geändert')}
                onScorer={(k, darf) => void ausfuehren(async () => ersetzen(await setUserMayScore(k.id, darf)))}
                onSperre={(k, gesperrt) => void ausfuehren(async () => ersetzen(await setUserLocked(k.id, gesperrt)), gesperrt ? 'Account gesperrt' : 'Account entsperrt')}
                onDialog={setDialog}
              />
            ))}
          </ul>
        </Card>
      )}

      {dialog?.art === 'loeschen' && (
        <ConfirmModal
          title="Account löschen?"
          message={`Der Account „${dialog.konto.username}“ wird gelöscht. Der Spieler bleibt im Kader, kann sich aber nicht mehr anmelden. Die Historie behält den Namen.`}
          onConfirm={() => void bestaetigt()}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.art === 'zuruecksetzen' && (
        <ConfirmModal
          title="Passwort zurücksetzen?"
          message={`Das Passwort von „${dialog.konto.username}“ wird auf das verteilte Passwort gesetzt. Danach muss ${dialog.konto.username} ein eigenes wählen.`}
          confirmLabel="Zurücksetzen"
          onConfirm={() => void bestaetigt()}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.art === 'massenanlage' && (
        <AnkuendigungModal title="Accounts anlegen" confirmLabel="Anlegen" onConfirm={() => void bestaetigt()} onCancel={() => setDialog(null)}>
          <p>
            Für {ohneAccount} aktive{ohneAccount === 1 ? 'r' : ''} Spieler ohne Account wird je ein Account angelegt.
            Der Benutzername ist der Spielername, das Passwort das verteilte Passwort.
          </p>
          <p>
            Kollidiert ein Name mit einem bestehenden, wird er nicht verändert, sondern übersprungen —
            danach steht hier, wer es war und warum.
          </p>
        </AnkuendigungModal>
      )}
    </div>
  )
}

export default AccountsPage
