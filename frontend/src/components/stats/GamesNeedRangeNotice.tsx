/** Ersatz für die Einsätze-Tabelle bei Zeiträumen ohne Spiele-Zähler (Spiel, Spieltag, Nach Gegner). */
export function GamesNeedRangeNotice() {
  return (
    <div role="note" className="bg-cream-50 border border-cream-300 rounded-2xl p-8 text-center text-gray-600">
      Einsätze zählt ganze Spiele — dafür braucht es einen Zeitraum über mehrere Spiele.
      Wähle Saison, Jahr oder Alle Zeit.
    </div>
  )
}
