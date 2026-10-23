/**
 * Entfernt aus einer Tailwind-Klassenliste, was Klickbarkeit vortäuscht: hover-, active- und
 * group-Varianten sowie cursor-pointer. Für Flächen, die ohne Recht keine Links mehr sind.
 */
export function ohneKlickstile(className = ''): string {
  return className
    .split(/\s+/)
    .filter(t => t && !/^(group-hover:|hover:|active:|group\/|group$|cursor-pointer$)/.test(t))
    .join(' ')
}
