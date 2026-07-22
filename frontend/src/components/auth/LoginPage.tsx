import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/shared'

interface LoginPageProps {
  onLogin: (password: string) => void
  error: string | null
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [password, setPassword] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onLogin(password)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      {/* Top + bottom red stripe = stadium-pocket signature */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-softball-red-600" />
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-softball-red-600" />

      <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-softball-red-600 blur-xl opacity-25 rounded-full" />
            <img
              src="/deadsox.jpeg"
              alt="Dead Sox"
              className="relative h-20 w-20 rounded-2xl border-2 border-softball-red-600 shadow-lg shadow-navy-900/15"
            />
          </div>
          <p className="font-display text-[10px] tracking-[0.4em] uppercase text-softball-red-600 font-bold mt-4">Dead Sox</p>
          <h1 className="font-display text-3xl font-black text-navy-900 tracking-tight uppercase leading-none mt-1">
            Lineup HQ
          </h1>
        </div>

        {/* Card */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="username" className="sr-only">Benutzer</label>
            {/* Hidden username field for browser autofill UX */}
            <input
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              value="admin"
              readOnly
              hidden
            />
            <label htmlFor="password" className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-cream-100 border border-cream-300 rounded-lg px-3 py-2.5 text-sm text-navy-900 placeholder-gray-400 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="font-display text-[11px] tracking-widest uppercase text-softball-red-700 font-bold bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="font-display w-full py-3 rounded-xl text-sm font-extrabold tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20"
          >
            Ready Up
          </Button>
        </div>
      </form>
    </div>
  )
}
