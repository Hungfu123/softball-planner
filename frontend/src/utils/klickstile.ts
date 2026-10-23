/*
 * Entfernt aus einer Tailwind-Klassenliste, was Klickbarkeit vortäuscht. Für Flächen, die ohne
 * Recht keine Links mehr sind.
 *
 * Erkannt wird ein Token, wenn eine seiner Varianten hover, active, group-hover, group-active,
 * peer-hover oder peer-active ist (auch mit Namen wie `group-hover/zeile` und hinter anderen
 * Varianten wie `sm:hover:` oder `md:active:`), oder wenn die Basisklasse `cursor-pointer`,
 * `group` oder `group/name` ist. Das Ausrufezeichen für „important“ steht in Tailwind v4 hinten
 * (`hover:bg-x!`), in v3 vorn (`!hover:bg-x`) — beides zählt.
 *
 * Grenze: Varianten in eckigen Klammern (`[&:hover]:bg-x`, `[@media(hover:hover)]:…`) werden
 * NICHT erkannt. Wer so etwas an einer gesperrten Fläche braucht, muss es von Hand weglassen.
 */
const KLICK_VARIANTE = /^(hover|active|group-hover|group-active|peer-hover|peer-active)(\/.+)?$/
const KLICK_BASIS = /^(cursor-pointer|group(\/.+)?)$/

function vortaeuscht(token: string): boolean {
  const teile = token.replace(/^!/, '').split(':')
  const basis = (teile.pop() ?? '').replace(/!$/, '')
  return KLICK_BASIS.test(basis) || teile.some(v => KLICK_VARIANTE.test(v))
}

export function ohneKlickstile(className = ''): string {
  return className
    .split(/\s+/)
    .filter(t => t && !vortaeuscht(t))
    .join(' ')
}
