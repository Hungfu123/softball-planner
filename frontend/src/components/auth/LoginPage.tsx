import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/shared'
import { AugeIcon, AugeZuIcon } from '@/icons'

interface LoginPageProps {
  onLogin: (username: string, password: string) => void
  error: string | null
}

/*
 * Die einzige dunkle Seite der App — bewusst. Sie ist die Tür, nicht der Raum: dahinter wird
 * es hell und das Navy zieht sich in Kopfzeile und Karten zurück.
 *
 * Benutzt wird `deadsox-mark.svg`, die Marke OHNE Hintergrundquadrat. `deadsox.svg` trägt ein
 * <rect> in #142B49 — auf dieser Fläche wäre es heute unsichtbar, weil navy-900 genau dieser Wert
 * ist, aber die Gleichheit stünde nirgends geschrieben. Eine Marke ohne Quadrat sitzt auf jedem
 * Grund richtig, auch wenn jemand das Token später anfasst.
 *
 * Der globale Tastatur-Fokus ist rot (index.css). Auf Navy ist Rot auf Dunkelblau schwach und ein
 * leeres Feld sähe aus wie ein Fehler, ausgerechnet beim ersten Kontakt — deshalb hier weiß.
 */
const FELD =
  'w-full min-h-12 rounded-lg px-3 py-2.5 text-sm text-white bg-white/[0.07] border border-white/20 ' +
  'placeholder-navy-300/70 transition-colors ' +
  // Nicht outline-none: der Tastatur-Fokus muss sichtbar bleiben. Die Farbe kommt aus
  // --fokus-farbe, die der dunkle Rahmen unten auf Weiß setzt.
  'focus:border-white ' +
  // Chrome malt Autofill sonst hellgelb über das dunkle Feld.
  '[&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[transition:background-color_9999s]'

const LABEL = 'font-display block text-[10px] tracking-widest uppercase font-bold text-navy-300 mb-1.5'

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  /*
   * Das Passwort steht in der WhatsApp-Gruppe und wird abgetippt — oft am Handy, oft mit
   * Zeichen, die man auf der Bildschirmtastatur erst suchen muss. Wer sich dabei vertippt,
   * sieht nur „Anmeldung fehlgeschlagen" und weiss nicht, ob er den falschen Namen oder
   * den falschen Buchstaben hat. Ein Blick aufs Eingetippte beantwortet das.
   *
   * Beginnt verborgen: offen anzufangen hiesse, das Passwort fuer jeden sichtbar zu machen,
   * der zufaellig danebensteht. Zeigen ist eine Entscheidung, Verbergen die Vorgabe.
   */
  const [sichtbar, setSichtbar] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onLogin(username.trim(), password)
  }

  return (
    <div className="min-h-dvh bg-navy-900 flex items-center justify-center px-5 py-10 [--fokus-farbe:#fff]">
      {/* Roter Saum oben und unten — dieselbe Signatur wie die Kopfzeile dahinter */}
      <div className="fixed top-0 inset-x-0 h-1 bg-softball-red-600" />
      <div className="fixed bottom-0 inset-x-0 h-1 bg-softball-red-600" />

      <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <img src="/deadsox-mark.svg" alt="" className="h-24 w-24 sm:h-26 sm:w-26" />
          <h1 className="font-headline text-4xl sm:text-5xl font-black text-white tracking-tight uppercase leading-none mt-4">
            Dead Sox
          </h1>
          <p className="text-xs text-navy-300 mt-2 text-center">Aufstellung, Statistik, Spielbetrieb</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className={LABEL}>Benutzername</label>
            <input
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={FELD}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className={LABEL}>Passwort</label>
            <div className="relative">
              <input
                id="password"
                type={sichtbar ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${FELD} pr-12`}
              />
              {/*
                Im Feld statt darunter: der Schalter gehoert zu dem, was er zeigt. 44 Pixel
                Fassflaeche, auch wenn das Zeichen 18 misst — getroffen wird der Knopf, nicht
                das Auge. `tabIndex={-1}`, damit die Tabulatortaste vom Passwort direkt auf
                „Ready Up" springt und nicht auf einen Umweg.
              */}
              <button
                type="button"
                onClick={() => setSichtbar(v => !v)}
                aria-label={sichtbar ? 'Passwort verbergen' : 'Passwort anzeigen'}
                aria-pressed={sichtbar}
                tabIndex={-1}
                className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-navy-300 hover:text-white transition-colors cursor-pointer"
              >
                {sichtbar ? <AugeZuIcon /> : <AugeIcon />}
              </button>
            </div>
          </div>

          {/*
            Am Deploy-Tag sieht das Team diese Maske zum ersten Mal und sucht nach
            "seinem" Passwort. Es gibt keins: alle bekommen dasselbe. Das muss hier
            stehen, nicht nur WO es steht — sonst sucht man nach etwas, das es nicht
            gibt. Der Hinweis auf Konto gehört dazu, sonst bleibt es für immer dabei.
          */}
          <p className="text-xs text-navy-300 leading-relaxed">
            Dein Benutzername ist dein Vorname, klein geschrieben. Das Passwort ist für alle dasselbe
            und steht in der WhatsApp-Gruppe — unter „Konto" kannst du danach ein eigenes setzen.
          </p>

          {error && (
            <p className="font-display text-[11px] tracking-widest uppercase text-softball-red-200 font-bold bg-softball-red-900/50 border border-softball-red-400/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="font-display w-full py-3.5 rounded-xl text-sm font-extrabold tracking-widest uppercase hover:bg-softball-red-700"
          >
            Ready Up
          </Button>
        </div>

        <p className="mt-5 text-center">
          <Link
            to="/counter"
            className="font-display inline-flex items-center min-h-11 px-3 text-[11px] font-bold uppercase tracking-widest text-navy-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white"
          >
            Nur Counter öffnen
          </Link>
        </p>
      </form>
    </div>
  )
}
