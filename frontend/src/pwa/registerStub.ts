/*
 * Steht in Vitest für `virtual:pwa-register/react`. Das Modul erzeugt vite-plugin-pwa erst
 * beim Bauen — in Vitest gibt es den Namen nicht, und schon der Import bricht ab, bevor
 * `vi.mock` überhaupt greifen kann. Deshalb der Umweg über einen Alias in `vitest.config.ts`.
 *
 * Diese Fassung tut absichtlich nichts: Tests, die den Wächter wirklich prüfen, legen mit
 * `vi.mock` ihre eigene darüber. Für alle anderen (die den Wächter nur mitladen, weil sie
 * `App` rendern) ist das Nichtstun richtig — ein Service Worker gehört nicht in einen Test.
 */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: async () => {},
  }
}
