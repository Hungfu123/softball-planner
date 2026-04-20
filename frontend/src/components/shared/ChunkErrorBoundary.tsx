import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

const RELOAD_FLAG = 'chunk-error-reload'

/**
 * Fängt Dynamic-Import-Fehler nach Deploys ab.
 * Bei PWA-Setups cached der Service Worker alte index.js die auf alte
 * Chunk-Namen zeigt — nach einem Re-Deploy ändern sich die Hashes.
 * Resultat: "Failed to fetch dynamically imported module" 404-Fehler.
 * Lösung: einmalig window.location.reload() → SW lädt neue Assets.
 */
export function ChunkErrorBoundary() {
  const error = useRouteError()
  const msg = error instanceof Error ? error.message : String(error)
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.toLowerCase().includes('chunkloaderror')

  useEffect(() => {
    if (!isChunkError) return
    // Guard gegen Reload-Loops: nur einmal reloaden pro Session
    const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG)
    if (alreadyReloaded) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
    // Service Worker zurücksetzen damit wir wirklich neue Assets holen
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .finally(() => window.location.reload())
    } else {
      window.location.reload()
    }
  }, [isChunkError])

  if (isChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto mb-3">
            <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
          </div>
          <p className="text-sm text-gray-600">App wird aktualisiert…</p>
        </div>
      </div>
    )
  }

  // Alle anderen Fehler: generische Fehleranzeige mit manuellem Reload
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Etwas ist schiefgelaufen</h1>
        <p className="text-sm text-gray-600 break-words">{msg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-lg bg-softball-red-600 text-white font-semibold cursor-pointer hover:bg-softball-red-700"
        >
          Neu laden
        </button>
      </div>
    </div>
  )
}
