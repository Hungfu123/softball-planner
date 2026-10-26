import { useCallback, useEffect, useState } from 'react'

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

  const setTheme = useCallback((neu: Theme) => setThemeState(neu), [])
  const umschalten = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), [])

  return { theme, setTheme, umschalten }
}

function gelesen(): Theme {
  try {
    return localStorage.getItem(SCHLUESSEL) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
