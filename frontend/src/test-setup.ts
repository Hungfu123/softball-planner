import '@testing-library/jest-dom/vitest'

// jsdom implementiert Element.prototype.scrollIntoView nicht — Komponenten, die beim Fokus
// scrollen (z.B. PollEditor.scrollIntoView fürs Mobil-Keyboard), werfen sonst eine
// "not a function"-Exception, sobald ein Test ein Feld fokussiert. Reiner Lückenschluss,
// kein Verhalten zu testen.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
