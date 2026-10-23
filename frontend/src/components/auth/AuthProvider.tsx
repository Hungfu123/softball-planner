import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { setAuth, hasAuth, clearAuth, UNAUTHORIZED_EVENT } from '@/api/client'
import type { MeResponse } from '@/types'
import { LoginPage } from './LoginPage'

interface AuthValue {
  loggedIn: boolean
  /** Die gespeicherten Zugangsdaten werden gerade gegen /api/me geprueft. */
  pruefend: boolean
  /** null, solange nicht bekannt — auch bei Netzfehler, wo der Nutzer angemeldet bleibt. */
  me: MeResponse | null
  error: string | null
  /** Fragt /api/me noch einmal; heilt `me === null` nach einem Netzfehler. */
  neuLaden: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function basic(): Record<string, string> {
  return { Authorization: `Basic ${localStorage.getItem('auth')}` }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(hasAuth())
  const [pruefend, setPruefend] = useState(hasAuth())
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  /*
   * Laufende Nummer des Anmelde- oder Pruefversuchs. Wer zweimal hintereinander tippt, weil
   * der erste Versuch hängt, soll nicht dadurch wieder abgemeldet werden, dass die alte
   * Antwort später eintrudelt. Nur die Antwort des jüngsten Versuchs zählt. Abmelden und
   * 401 zaehlen ebenfalls hoch: eine spaete /api/me-Antwort darf sie nicht rueckgaengig machen.
   */
  const versuch = useRef(0)

  const abmelden = useCallback(() => {
    versuch.current++
    clearAuth()
    setMe(null)
    setLoggedIn(false)
    setPruefend(false)
  }, [])

  // Jeder Seitenaufbau: gespeicherte Zugangsdaten pruefen. /api/me, nicht der Handschlag —
  // lastLoginAt gehoert dem Absenden des Formulars. Nur 401 meldet ab; Netz- oder
  // Serverfehler heissen "ich komme gerade nicht ran", nicht "du darfst nicht mehr" (PWA).
  useEffect(() => {
    if (!hasAuth()) return
    const meiner = ++versuch.current
    fetch('/api/me', { headers: basic() })
      .then(async res => {
        if (meiner !== versuch.current) return
        if (res.status === 401) {
          clearAuth()
          setLoggedIn(false)
        } else if (res.ok) {
          setMe(await res.json())
        }
      })
      .catch(() => {})
      .finally(() => {
        if (meiner === versuch.current) setPruefend(false)
      })
  }, [])

  /*
   * Ist /api/me beim Seitenaufbau gescheitert, bleibt der Nutzer angemeldet, aber `me` ist
   * null — und die Oberfläche zeigt dann alles. Das heilt sich selbst: sobald das Fenster
   * wieder online geht oder den Fokus bekommt, wird /api/me erneut gefragt.
   */
  const neuLaden = useCallback(async () => {
    if (!hasAuth()) return
    const meiner = ++versuch.current
    try {
      const res = await fetch('/api/me', { headers: basic() })
      if (meiner !== versuch.current) return
      if (res.status === 401) {
        clearAuth()
        setLoggedIn(false)
      } else if (res.ok) {
        setMe(await res.json())
      }
    } catch {
      // bleibt null — der Nutzer kann es erneut versuchen
    }
  }, [])

  useEffect(() => {
    if (!loggedIn || pruefend || me !== null) return
    const nachladen = () => { void neuLaden() }
    window.addEventListener('online', nachladen)
    window.addEventListener('focus', nachladen)
    return () => {
      window.removeEventListener('online', nachladen)
      window.removeEventListener('focus', nachladen)
    }
  }, [loggedIn, pruefend, me, neuLaden])

  // request<T> meldet eine abgelehnte Anmeldung per Ereignis, ein harter Reload wuerde ein
  // offenes Formular verwerfen.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, abmelden)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, abmelden)
  }, [abmelden])

  const login = useCallback(async (username: string, password: string) => {
    const meiner = ++versuch.current
    setAuth(username, password)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: basic() })
      if (meiner !== versuch.current) return

      if (res.ok) {
        const auskunft: MeResponse = await res.json()
        if (meiner !== versuch.current) return
        setError(null)
        setMe(auskunft)
        setLoggedIn(true)
        setPruefend(false)
        return
      }

      // Alles außer einer erfolgreichen Antwort heißt: nicht angemeldet. Früher galt nur
      // 401 als Fehlschlag, ein 500 führte auf ein Dashboard, dessen API-Aufrufe alle
      // scheiterten.
      clearAuth()
      setError(
        res.status === 401
          ? 'Benutzername oder Passwort falsch'
          : `Anmeldung fehlgeschlagen (Fehler ${res.status})`,
      )
    } catch {
      if (meiner !== versuch.current) return
      clearAuth()
      setError('Server nicht erreichbar')
    }
  }, [])

  const logout = useCallback(() => {
    setError(null)
    abmelden()
  }, [abmelden])

  const value = useMemo(
    () => ({ loggedIn, pruefend, me, error, neuLaden, login, logout }),
    [loggedIn, pruefend, me, error, neuLaden, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth braucht einen AuthProvider darüber')
  return auth
}

/** Wie useAuth, aber ohne Wurf: für öffentliche Seiten, die auch ohne Provider laufen müssen. */
// eslint-disable-next-line react-refresh/only-export-components -- wie useAuth: Hook neben dem Provider, der den Kontext besitzt
export function useOptionalAuth(): AuthValue | null {
  return useContext(AuthContext)
}

/**
 * Das Auth-Gate der App. Jede Route außer /counter liegt dahinter — genau eine
 * Stelle, an der geprüft wird, statt eines zweiten Pfads neben dem Router.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.pruefend) {
    return (
      <div role="status" aria-label="Anmeldung wird geprüft" className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-cream-300 border-t-softball-red-600 animate-spin" />
      </div>
    )
  }
  if (!auth.loggedIn) return <LoginPage onLogin={auth.login} error={auth.error} />
  return <>{children}</>
}
