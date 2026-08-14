import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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

  const login = useCallback(async (password: string) => {
    setAuth(password)
    try {
      const res = await fetch('/api/players', {
        headers: { Authorization: `Basic ${btoa(`admin:${password}`)}` },
      })
      if (res.status === 401) {
        clearAuth()
        setError('Falsches Passwort')
        return
      }
      setError(null)
      setLoggedIn(true)
    } catch {
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
