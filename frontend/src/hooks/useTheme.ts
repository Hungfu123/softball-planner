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
    // Die Browserleiste am Handy trägt dieselbe Farbe wie das Band darunter.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#061A35' : '#142B49')
  }, [theme])

  // Solange niemand gewählt hat, folgt die App dem Gerät — auch wenn es sich
  // während der Sitzung umstellt (viele Systeme schalten abends automatisch).
  // Nach der ersten eigenen Wahl liegt sie im localStorage und das hier schweigt.
  useEffect(() => {
    if (gespeichert() !== null) return
    // matchMedia fehlt in jsdom und in alten Browsern. Beides ist derselbe Fall:
    // dann gibt es eben keine Systemfarbe, der die App folgen koennte.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq?.addEventListener) return
    const folgen = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', folgen)
    return () => mq.removeEventListener('change', folgen)
  }, [])

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

  /** Gespeichert wird erst, wenn jemand WÄHLT — sonst fröre der erste Besuch die
   *  damalige Systemeinstellung ein, ohne dass jemand etwas gesagt hätte. */
  const merken = useCallback((neu: Theme) => {
    try {
      localStorage.setItem(SCHLUESSEL, neu)
    } catch {
      // Privates Fenster oder gesperrter Speicher: die Wahl gilt nur für diese Sitzung.
    }
  }, [])

  const setTheme = useCallback(
    (neu: Theme) => {
      merken(neu)
      anwenden(neu)
    },
    [anwenden, merken],
  )
  const umschalten = useCallback(() => {
    const neu = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    merken(neu)
    anwenden(neu)
  }, [anwenden, merken])

  return { theme, setTheme, umschalten }
}

/** Die eigene Wahl, oder null wenn noch keine getroffen wurde. */
function gespeichert(): Theme | null {
  try {
    const t = localStorage.getItem(SCHLUESSEL)
    return t === 'dark' || t === 'light' ? t : null
  } catch {
    return null
  }
}

/**
 * Ohne eigene Wahl entscheidet das Gerät. Wer sein Handy auf dunkel gestellt hat, hat
 * damit schon gesagt, was er will — ihn beim ersten Besuch hell anzublitzen wäre, als
 * hörte man nicht zu. Dieselbe Regel steht als Schnipsel in index.html, damit sie schon
 * vor dem ersten Zeichnen greift; hier ist sie, damit React denselben Stand kennt.
 */
function gelesen(): Theme {
  const eigen = gespeichert()
  if (eigen) return eigen
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
