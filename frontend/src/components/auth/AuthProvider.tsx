import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { setAuth, hasAuth, clearAuth } from '@/api/client'
import { LoginPage } from './LoginPage'

interface AuthValue {
  loggedIn: boolean
  error: string | null
  login: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(hasAuth())
  const [error, setError] = useState<string | null>(null)

  /*
   * Laufende Nummer des Anmeldeversuchs. Wer zweimal hintereinander tippt, weil der erste
   * Versuch hängt, soll nicht dadurch wieder abgemeldet werden, dass die alte Antwort
   * später eintrudelt. Nur die Antwort des jüngsten Versuchs zählt.
   */
  const versuch = useRef(0)

  const login = useCallback(async (password: string) => {
    const meiner = ++versuch.current
    setAuth(password)
    try {
      const res = await fetch('/api/players', {
        // Uebergang: fester Benutzername, bis die Anmeldung ein Benutzer-Feld bekommt (Accounts-Plan, Task 9)
        headers: { Authorization: `Basic ${btoa(`hung:${password}`)}` },
      })
      if (meiner !== versuch.current) return

      if (res.ok) {
        setError(null)
        setLoggedIn(true)
        return
      }

      // Alles außer einer erfolgreichen Antwort heißt: nicht angemeldet. Früher galt nur
      // 401 als Fehlschlag, ein 500 führte auf ein Dashboard, dessen API-Aufrufe alle
      // scheiterten.
      clearAuth()
      setError(
        res.status === 401
          ? 'Falsches Passwort'
          : `Anmeldung fehlgeschlagen (Fehler ${res.status})`,
      )
    } catch {
      if (meiner !== versuch.current) return
      clearAuth()
      setError('Server nicht erreichbar')
    }
  }, [])

  const value = useMemo(() => ({ loggedIn, error, login }), [loggedIn, error, login])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Das Auth-Gate der App. Jede Route außer /counter liegt dahinter — genau eine
 * Stelle, an der geprüft wird, statt eines zweiten Pfads neben dem Router.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('RequireAuth braucht einen AuthProvider darüber')
  if (!auth.loggedIn) return <LoginPage onLogin={auth.login} error={auth.error} />
  return <>{children}</>
}
