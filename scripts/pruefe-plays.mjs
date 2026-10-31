#!/usr/bin/env node
/**
 * Prueft alle Start-Plays gegen das, was auf dem Platz gelten muss.
 *
 *   node scripts/pruefe-plays.mjs            # laesst den Generator selbst laufen
 *   node scripts/pruefe-plays.mjs datei.sql  # prueft eine fertige Migration
 *   … --kurz                                 # nur die Zaehlung
 *
 * Sieben Regeln, jede nennt Play und Stand:
 *   1 Neun Verteidiger, keiner doppelt
 *   2 Ein Wurf auf eine Base hat jemanden, der ihn faengt
 *   3 Outs steigen, bleiben unter vier, und ein Out zaehlt auch
 *   4 Niemand springt (Runner 90 ft, Verteidiger 140 ft je Stand)
 *   5 Kein Stand, in dem sich nichts bewegt UND nichts gesagt wird
 *   6 Home steht nicht offen, wenn ein Runner darauf zulaeuft
 *   7 Der Pitcher steht nicht herum, waehrend der Ball im Outfield ist
 *
 * **Wer den Katalog aendert, laesst das hier laufen.** Der Prueffer ist absichtlich
 * misstrauisch getestet: schickt man alle 1B vom Platz, meldet er elf fehlende
 * Empfaenger — ein Prueffer, der nie etwas findet, prueft nichts.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const HOME = { x: 155, y: 218 }
const BASE_PATH = 60
const HALF = (BASE_PATH * Math.SQRT2) / 2
const B1 = { x: HOME.x + HALF, y: HOME.y - HALF }
const B2 = { x: HOME.x, y: HOME.y - BASE_PATH * Math.SQRT2 }
const B3 = { x: HOME.x - HALF, y: HOME.y - HALF }
const BASEN = { '1': B1, '2': B2, '3': B3, Home: HOME }

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const f = (mk, p) => mk.defenders.find(x => x.position === p)
const vonHome = (p) => d(p, HOME)

const datei = process.argv.slice(2).find(a => !a.startsWith('--'))
const text = datei
  ? readFileSync(datei, 'utf8')
  : execFileSync('node', [new URL('build-seed-plays.mjs', import.meta.url).pathname], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
const muster =
  /SELECT id, (\d+), (\d+), (NULL|'(?:[^']|'')*'), (\d+), '(\{[\s\S]*?\})'::jsonb\s*\nFROM play WHERE title = '((?:[^']|'')+)';/g

const plays = new Map()
for (const m of text.matchAll(muster)) {
  const [, ordinal, dauer, note, outs, markers, titel] = m
  const t = titel.replace(/''/g, "'")
  if (!plays.has(t)) plays.set(t, [])
  plays.get(t).push({
    ordinal: Number(ordinal),
    dauer: Number(dauer),
    note: note === 'NULL' ? '' : note.slice(1, -1).replace(/''/g, "'"),
    outs: Number(outs),
    mk: JSON.parse(markers.replace(/''/g, "'")),
  })
}

const befunde = []
const melde = (regel, titel, ordinal, text) => befunde.push({ regel, titel, ordinal, text })

for (const [titel, steps] of plays) {
  steps.sort((a, b) => a.ordinal - b.ordinal)
  let ballImOutfield = false
  const pStart = f(steps[0].mk, 'P')
  let pBewegt = false

  steps.forEach((s, i) => {
    const mk = s.mk
    const vorher = i > 0 ? steps[i - 1].mk : null

    // 1 Vollstaendigkeit: neun Verteidiger, keine Doppelten
    if (mk.defenders.length !== 9) melde('Feld', titel, s.ordinal, `${mk.defenders.length} Verteidiger`)
    const namen = new Set(mk.defenders.map(x => x.position))
    if (namen.size !== mk.defenders.length) melde('Feld', titel, s.ordinal, 'Position doppelt')

    if (vonHome(mk.ball) > 150) ballImOutfield = true
    if (d(f(mk, 'P'), pStart) > 6) pBewegt = true

    if (!vorher) return

    // 2 Wurf auf eine Base: steht da jemand, der ihn faengt?
    const strecke = d(vorher.ball, mk.ball)
    const ziel = Object.entries(BASEN).find(([, b]) => d(mk.ball, b) <= 12)
    const warPitch = vorher.ball.holder === 'P' && mk.ball.holder === 'C' && ziel?.[0] === 'Home'
    if (strecke >= 25 && ziel && !warPitch) {
      const naechster = mk.defenders
        .map(x => ({ x, weg: d(x, BASEN[ziel[0]]) }))
        .sort((a, b) => a.weg - b.weg)[0]
      if (naechster.weg > 14) {
        melde('Empfaenger', titel, s.ordinal, `Wurf auf die ${ziel[0]}, naechster ist ${naechster.x.position} (${naechster.weg.toFixed(0)} ft)`)
      }
    }

    // 3 Outs: nie weniger als vorher, hoechstens drei, und ein Out muss zaehlen
    if (s.outs < steps[i - 1].outs) melde('Outs', titel, s.ordinal, `${steps[i - 1].outs} → ${s.outs}`)
    if (s.outs > 3) melde('Outs', titel, s.ordinal, `${s.outs} Outs`)
    const neuRaus = mk.runners.filter(r => r.status === 'OUT' && !vorher.runners.some(v => v.id === r.id && v.status === 'OUT')).length
    if (neuRaus > 0 && s.outs === steps[i - 1].outs) {
      melde('Outs', titel, s.ordinal, `${neuRaus} Runner out, aber der Zaehler bleibt bei ${s.outs}`)
    }

    // 4 Menschen springen nicht: in einem Stand schafft niemand 90 ft
    for (const r of mk.runners) {
      const alt = vorher.runners.find(v => v.id === r.id)
      if (alt && d(alt, r) > 90) melde('Sprung', titel, s.ordinal, `Runner ${r.id} legt ${d(alt, r).toFixed(0)} ft zurueck`)
    }
    for (const x of mk.defenders) {
      const alt = f(vorher, x.position)
      if (alt && d(alt, x) > 140) melde('Sprung', titel, s.ordinal, `${x.position} legt ${d(alt, x).toFixed(0)} ft zurueck`)
    }

    // 5 Ein Stand, in dem sich nichts bewegt, erzaehlt nichts
    const stillBall = d(vorher.ball, mk.ball) < 1
    const stillFeld = mk.defenders.every(x => d(f(vorher, x.position) ?? x, x) < 1)
    const stillRunner = mk.runners.every(r => {
      const alt = vorher.runners.find(v => v.id === r.id)
      return !alt || (d(alt, r) < 1 && alt.status === r.status)
    })
    if (stillBall && stillFeld && stillRunner && mk.runners.length === vorher.runners.length) {
      melde('Stillstand', titel, s.ordinal, 'nichts bewegt sich')
    }

    // 6 Home darf nicht offen stehen, wenn ein Runner hinwill
    // Nur wer auf Home ZUlaeuft, ist eine Gefahr. Der Batter, der gerade losgerannt ist,
    // steht zwar nah an der Platte, entfernt sich aber von ihr.
    const runnerNahHome = mk.runners.some(r => {
      if (r.status !== 'ACTIVE') return false
      const alt = vorher.runners.find(v => v.id === r.id)
      if (!alt) return false
      return vonHome(r) < 45 && vonHome(r) > 2 && vonHome(r) < vonHome(alt) - 1
    })
    const jemandAnHome = mk.defenders.some(x => vonHome(x) < 16)
    if (runnerNahHome && !jemandAnHome) melde('Home offen', titel, s.ordinal, 'Runner kommt, niemand an der Platte')
  })

  // 7 Der Pitcher steht nicht herum, wenn der Ball ins Outfield geht
  if (ballImOutfield && !pBewegt) melde('Pitcher', titel, 0, 'Ball im Outfield, der P bleibt die ganze Zeit stehen')
}

const nachRegel = new Map()
for (const b of befunde) nachRegel.set(b.regel, (nachRegel.get(b.regel) ?? 0) + 1)

console.log(`${plays.size} Plays, ${[...plays.values()].reduce((s, x) => s + x.length, 0)} Staende`)
console.log(`Befunde: ${befunde.length}`)
for (const [regel, zahl] of [...nachRegel].sort((a, b) => b[1] - a[1])) console.log(`  ${regel}: ${zahl}`)
if (!process.argv.includes('--kurz')) {
  console.log('')
  for (const b of befunde) console.log(`  [${b.regel}] ${b.titel}${b.ordinal ? ' · Stand ' + b.ordinal : ''}: ${b.text}`)
}

// Ein Befund ist ein Fehler: so faellt es auch auf, wenn das hier in einer Kette laeuft.
process.exitCode = befunde.length === 0 ? 0 : 1
