/**
 * Lade-Zustand der Stats-Tabellen — spiegelt die echte Tabellen-Silhouette wider:
 * Navy-Header-Zeile mit Spalten-Labels + ~8 Daten-Zeilen (erste Spalte breiter = Spieler-Name,
 * Rest schmale Zahl-Zellen). Kein Layout-Sprung beim Dateneintritt.
 *
 * Passt zu BattingStatsTable-Spaltenbild:
 *   # | Spieler | Schlag | Treffer | AVG | Quote | Walks | K | HR | SB
 */
/**
 * Der Platzhalter der Statistik-Tabelle — in ihrer Form, nicht als Spinner.
 *
 * Die Balken liegen auf `bar-track`, der Rolle „Rinne": da liegt noch nichts. Vorher war es
 * `cream-200`, also eine helle FLAECHE — im Dunkeln deutet der Shim Cremetoene nach oben um,
 * und aus der Rinne wurde ein Block. Ein Skelett, das heller ist als die Karte, sieht aus
 * wie Inhalt, nicht wie fehlender Inhalt.
 */
export function StatsTableSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Statistiken werden geladen…</span>

      <div className="bg-surface-raised border border-line rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Header-Reihe */}
            <thead>
              <tr className="bg-band">
                {/* # */}
                <th className="px-3 py-2.5 text-left w-8">
                  <div className="skeleton-shimmer h-2.5 w-3 rounded-full bg-white/20" />
                </th>
                {/* Spieler — breiter */}
                <th className="px-3 py-2.5 text-left">
                  <div className="skeleton-shimmer h-2.5 w-14 rounded-full bg-white/20" />
                </th>
                {/* Schlag */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-10 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* Treffer */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-10 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* AVG */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-8 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* Quote */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-10 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* Walks */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-10 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* K */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-4 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* HR */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-5 rounded-full bg-white/15 ml-auto" />
                </th>
                {/* SB */}
                <th className="px-3 py-2.5 text-right">
                  <div className="skeleton-shimmer h-2.5 w-5 rounded-full bg-white/15 ml-auto" />
                </th>
              </tr>
            </thead>

            {/* Daten-Reihen */}
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <tr
                  key={i}
                  className={`border-b border-line last:border-0 ${i % 2 === 1 ? 'bg-surface-sunken' : 'bg-surface-raised'}`}
                >
                  {/* Rang */}
                  <td className="px-3 py-2.5 text-left">
                    <div className="skeleton-shimmer h-3.5 w-3.5 rounded bg-bar-track" />
                  </td>
                  {/* Spieler-Name — breiter, variiert für natürlichen Look */}
                  <td className="px-3 py-2.5">
                    <div
                      className={`skeleton-shimmer h-3.5 rounded-full bg-bar-track ${
                        i % 4 === 0 ? 'w-28' : i % 4 === 1 ? 'w-20' : i % 4 === 2 ? 'w-24' : 'w-32'
                      }`}
                    />
                  </td>
                  {/* Schlag */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-6 rounded-full bg-bar-track ml-auto" />
                  </td>
                  {/* Treffer */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-5 rounded-full bg-bar-track ml-auto" />
                  </td>
                  {/* AVG — etwas breiter (3-stellige Dezimalzahl) */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-4 w-10 rounded bg-bar-track ml-auto" />
                  </td>
                  {/* Quote mit Bar-Platzhalter */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="skeleton-shimmer w-12 h-1.5 rounded-full bg-bar-track" />
                      <div className="skeleton-shimmer h-3 w-8 rounded-full bg-bar-track" />
                    </div>
                  </td>
                  {/* Walks */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-4 rounded-full bg-bar-track ml-auto" />
                  </td>
                  {/* K */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-4 rounded-full bg-bar-track ml-auto" />
                  </td>
                  {/* HR */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-4 rounded-full bg-bar-track ml-auto" />
                  </td>
                  {/* SB */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="skeleton-shimmer h-3 w-4 rounded-full bg-bar-track ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
