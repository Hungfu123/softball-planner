/**
 * Der rote Strich vor einer Ueberschrift.
 *
 * Keine Meldung, sondern Gliederung: er sagt "hier faengt etwas an". Rot trug in
 * dieser App bisher nur Signale — live, Niederlage, Fehler, Hauptaktion —, und im
 * hellen Theme reichte das, weil dort schon Cream gegen Navy Charakter tragen.
 * Im Dunkeln ist alles Navy; der Haarstrich unter der Kopfleiste war das einzige,
 * was nicht blau ist. Dieselbe Marke an jeder Abschnittsueberschrift gibt der Seite
 * ihren Takt zurueck, ohne dem Rot seine Bedeutung zu nehmen.
 *
 * Nicht in Dialogen (Sheet, Drawer, Modal): die haben keinen Abschnitt, sie SIND
 * einer. Und nicht in der Analyse-Oberflaeche — dort ist Rot fuer negative Zahlen
 * reserviert, und ein Gliederungsstrich wuerde genau das verwaessern.
 *
 * `aria-hidden`: fuer Screenreader ist der Strich nichts, und er darf den
 * zugaenglichen Namen der Ueberschrift nicht veraendern.
 */
export function Abschnittsmarke({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const hoehe = size === 'sm' ? 'h-4' : size === 'lg' ? 'h-7' : 'h-5'
  return <span aria-hidden className={`w-1 ${hoehe} bg-softball-red-600 rounded-full shrink-0`} />
}
