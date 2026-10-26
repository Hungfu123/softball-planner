import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

const SCHLUESSEL = 'theme'

/**
 * Hell oder dunkel, pro Gerät gespeichert — nicht am Account. Abends am Handy dunkel und
 * tagsüber am Laptop hell ist der Normalfall; ein Wert am Account würde das gegeneinander
 * ausspielen. Das heißt auch: niemand sieht die Wahl eines anderen, und sie überlebt kein
 * neues Gerät. Beides gewollt.
 *
 * Gesetzt wird das Attribut auf {@code <html>}; die Werte dazu stehen in index.css unter
 * {@code [data-theme="dark"]}. Beim Seitenaufbau macht das schon ein Schnipsel in index.html —
 * ohne ihn blitzte die helle Seite auf, bevor React läuft.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => gelesen())

  useEffect(() => {
    const wurzel = document.documentElement
    if (theme === 'dark') {
      wurzel.setAttribute('data-theme', 'dark')
    } else {
      wurzel.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem(SCHLUESSEL, theme)
    } catch {
      // Privates Fenster oder gesperrter Speicher: die Wahl gilt dann nur für diese Sitzung.
    }
  }, [theme])

  /**
   * Der Wechsel ist der einzige Moment dieser App, der eine eigene Bewegung verdient:
   * er betrifft alles auf einmal, und genau das soll man sehen. Ohne ihn springen die
   * Flächen sofort um, während die Schriftfarben noch 150 ms nachblenden — für einen
   * Wimpernschlag steht dunkle Schrift auf dunklem Grund.
   *
   * `startViewTransition` legt stattdessen einen Schnappschuss über die Seite und
   * blendet ihn gegen den neuen Zustand. Währenddessen sind die Einzelübergänge aus
   * (data-theme-wechsel, siehe index.css) — sonst liefen zwei Bewegungen gegeneinander.
   *
   * Wer den Browser auf reduzierte Bewegung gestellt hat, bekommt den Sprung. Wessen
   * Browser die API nicht kennt, auch. Beides ist kein Verlust: die Seite ist danach
   * dieselbe.
   */
  const anwenden = useCallback((neu: Theme) => {
    const wurzel = document.documentElement
    const reduziert = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduziert || typeof document.startViewTransition !== 'function') {
      setThemeState(neu)
      return
    }
    wurzel.setAttribute('data-theme-wechsel', '')
    const lauf = document.startViewTransition(() => flushSync(() => setThemeState(neu)))
    void lauf.finished.finally(() => wurzel.removeAttribute('data-theme-wechsel'))
  }, [])

  const setTheme = useCallback((neu: Theme) => anwenden(neu), [anwenden])
  const umschalten = useCallback(
    () => anwenden(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'),
    [anwenden],
  )

  return { theme, setTheme, umschalten }
}

function gelesen(): Theme {
  try {
    return localStorage.getItem(SCHLUESSEL) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
