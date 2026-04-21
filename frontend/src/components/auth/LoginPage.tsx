import { useState } from 'react'
import type { FormEvent } from 'react'

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
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <form onSubmit={handleSubmit} className="bg-navy-800 p-8 rounded-lg shadow-2xl w-80 border border-navy-700">
        <div className="flex justify-center mb-6">
          <img src="/deadsox.jpeg" alt="Dead Sox" className="h-20 w-20 rounded-full border-2 border-softball-red-600" />
        </div>
        <h1 className="text-xl font-bold text-center mb-6 text-white">Dead Sox Lineup</h1>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Passwort"
          className="w-full px-3 py-2 bg-navy-700 border border-navy-600 text-white placeholder-gray-400 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-softball-red-500"
          autoFocus
        />
        {error && <p className="text-softball-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          className="w-full bg-softball-red-600 text-white py-2 rounded-md hover:bg-softball-red-700 transition-colors font-semibold"
        >
          Anmelden
        </button>
      </form>
    </div>
  )
}
