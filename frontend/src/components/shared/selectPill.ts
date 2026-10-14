/**
 * Pillen-Select: native Auswahl, eigener Pfeil.
 *
 * Nativ, weil das System-Picker am Handy jede Nachbau-Liste schlägt — und weil
 * eine Auswahl aus vielen Werten keine Reihe Chips sein sollte, durch die man
 * horizontal wischt. Dieselbe Optik wie die Filter im Spiel-Verlauf.
 */
export const CHEVRON_DOWN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

export const SELECT_PILL_CLASS =
  'appearance-none bg-no-repeat font-display text-[10px] font-bold tracking-widest uppercase ' +
  'rounded-full pl-3 pr-8 py-2 cursor-pointer border border-cream-300 bg-white text-gray-700 ' +
  'hover:bg-cream-100 transition-colors'

export const SELECT_PILL_STYLE = {
  backgroundImage: CHEVRON_DOWN,
  backgroundPosition: 'right 0.7rem center',
  backgroundSize: '0.65rem',
} as const
