import type { PointerEvent } from 'react'

/* Tap-Puls: Touchgeräte haben kein :hover. Beim Tippen auf eine Karte setzt
   diese Funktion kurz die Klasse .is-tapped auf das Element — die CSS-
   Definition in index.css löst damit denselben roten Akzent-Balken aus wie
   der Desktop-Hover und blendet ihn nach dem Timeout sanft wieder aus.

   - Nur echte Touch-Pointer zählen (pointerType 'touch'); Mausklicks
     behalten ihren gewohnten :hover.
   - Timer pro Element in einer WeakMap: schnelles Doppeltippen startet den
     Puls neu, statt einen alten Timeout die Klasse vorzeitig entfernen zu
     lassen.
   - 700ms: lange genug, den 280ms-Wisch zu sehen; kurz genug, dass der
     Balken nicht wie ein klebender False-Hover wirkt. */

const DURATION_MS = 700

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

export function tapPulse(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'touch') return
  const el = e.currentTarget
  el.classList.add('is-tapped')
  const prev = timers.get(el)
  if (prev) clearTimeout(prev)
  timers.set(
    el,
    setTimeout(() => {
      el.classList.remove('is-tapped')
      timers.delete(el)
    }, DURATION_MS),
  )
}
