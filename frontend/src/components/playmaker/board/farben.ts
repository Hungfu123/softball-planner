/**
 * Die Farben der Buehne, an einer Stelle.
 *
 * Sie hiessen zuerst nur im Spielwissen so und gehoeren jetzt dem Board, weil beide
 * dasselbe zeigen: ein Feld in Navy, Menschen und Linien in Cream, Amber fuer das, was
 * man im Auge behaelt, Rot fuer Out. Das Spielwissen holt sie ueber `buehne.tsx` hier ab.
 *
 * Die Buehne ist in BEIDEN Themes navy. Deshalb stehen hier feste Werte und keine
 * Paletten-Klassen: der Dunkel-Shim deutet `text-navy-900` zu Weiss um, und auf Amber
 * ergaebe das einen unlesbaren Stempel.
 */
export const FARBE = {
  hell: '#FBF6EC',   // cream-50, Figuren und Linien
  ball: '#FBF6EC',
  naht: '#CC2936',   // softball-red-600, der Nahtring
  gut: '#fbbf24',    // amber-400, Entscheidung und Zone
  raus: '#CC2936',   // softball-red-600, Strike und Out
  matt: '#6b7b96',   // Boden, Hilfslinien
  grund: '#142B49',  // die Buehne selbst — Schrift darauf ist hell
  /* Leder. Eine Materialfarbe wie das Silber der Medaillen-Plakette, kein Theme-Wert:
     ein cremefarbener Handschuh waere am cremefarbenen Ball nicht zu unterscheiden,
     und genau dieser Unterschied ist die Auskunft der Fang-Karte. */
  leder: '#B5793F',
  /* Rot als SCHRIFT auf der navy Buehne. softball-red-600 misst dort 2,68:1, noetig sind
     3,0 fuer grossen Text — als Flaeche mit cremefarbener Schrift ist dasselbe Rot in
     Ordnung, nur eben nicht andersherum. */
  rausHell: '#EE5A68',
} as const
