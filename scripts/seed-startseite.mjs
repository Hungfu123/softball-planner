#!/usr/bin/env node
/**
 * seed-startseite.mjs — fuellt die Startseite (`/`) mit einem lesbaren Jahr.
 *
 * Die drei Karten der persoenlichen Spalte brauchen etwas, das eine leere Dev-Datenbank
 * nicht hergibt:
 *   - "Naechstes Training" braucht Trainings, die in der ZUKUNFT liegen
 *   - "Dein Jahr" braucht Spieltage UND Trainings ueber das laufende Jahr verteilt
 *   - "Meine Zahlen" braucht At-Bats — die macht `seed-batting-stats.mjs`, nicht dieses Skript
 *
 * Die Zeilen in einer Dev-Datenbank sind kein Speicher (siehe `seed-rfl-demo.mjs`): das
 * dauerhafte Stueck ist dieses Skript, nicht das, was es anlegt. Es faehrt deshalb nur die
 * oeffentliche REST-API und fasst die Datenbank nie direkt an.
 *
 * Alle Termine haengen an HEUTE, nicht an festen Daten — sonst waere das Skript in drei
 * Monaten ein Skript, das Vergangenheit erzeugt.
 *
 * Aufruf:
 *   API_USER=hung API_PASSWORD='...' node scripts/seed-startseite.mjs
 *   API_USER=hung API_PASSWORD='...' node scripts/seed-startseite.mjs --delete <seasonId>
 *
 * Umgebungsvariablen (alle optional, Vorgaben passen auf die lokale Entwicklung):
 *   API_BASE_URL  Vorgabe "http://localhost:8080"
 *   API_USER      Vorgabe "hung"
 *   API_PASSWORD  Vorgabe "Deadsox123!"
 *
 * Braucht Node 18+ (eingebautes fetch), keine npm-Abhaengigkeiten.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'
const USER = process.env.API_USER || 'hung'
const PASSWORD = process.env.API_PASSWORD || 'Deadsox123!'
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64')

const SAISON_NAME = 'Sommerliga (Demo)'
/** Neun Feldpositionen in Schlagreihenfolge — ohne EH und ohne DH, das braucht eine Demo nicht. */
const POSITIONEN = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
/** Treffer-Arten, aus denen die Demo wuerfelt. Kein HBP: das verzerrt OBP mehr, als es zeigt. */
const SCHLAEGE = ['SINGLE', 'DOUBLE', 'SINGLE', 'HOMERUN', 'TRIPLE', 'SINGLE']
const TREFFER = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HOMERUN'])

const GEGNER = [
  'Bottrop Boars', 'Aachen Greyhounds', 'Geilenkirchen Misfits', 'Siegen Pirates',
  'Goose Ratingen', 'Titan Nics', 'ASML Veldhoven', 'Hagen Chipmunks',
]

async function api(methode, pfad, rumpf) {
  const antwort = await fetch(BASE_URL + pfad, {
    method: methode,
    headers: { Authorization: AUTH, ...(rumpf ? { 'Content-Type': 'application/json' } : {}) },
    body: rumpf ? JSON.stringify(rumpf) : undefined,
  })
  if (!antwort.ok) {
    throw new Error(`${methode} ${pfad} → ${antwort.status} ${antwort.statusText}\n${await antwort.text()}`)
  }
  return antwort.status === 204 ? null : antwort.json()
}

/** ISO-Datum in LOKALER Zeit — toISOString() waere UTC und nachts einen Tag daneben. */
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function plusTage(basis, tage) {
  const d = new Date(basis)
  d.setDate(d.getDate() + tage)
  return d
}

/** Der naechste Wochentag ab `basis` (0 = Sonntag). Heute zaehlt mit. */
function naechsterWochentag(basis, wochentag) {
  const d = new Date(basis)
  d.setDate(d.getDate() + ((wochentag - d.getDay() + 7) % 7))
  return d
}

/** Liga-Teams haengen an der Saison, nicht am Verein — jede Saison hat ihre eigene Tabelle. */
async function teamIds(saisonId) {
  const vorhanden = await api('GET', `/api/seasons/${saisonId}/teams`)
  const nachName = new Map(vorhanden.map(t => [t.name, t.id]))
  const ids = []
  for (const name of GEGNER) {
    if (nachName.has(name)) { ids.push(nachName.get(name)); continue }
    const neu = await api('POST', `/api/seasons/${saisonId}/teams`, { name, ownTeam: false })
    ids.push(neu.id)
  }
  return ids
}

async function seed() {
  const heute = new Date()
  const jahr = heute.getFullYear()

  const saison = await api('POST', '/api/seasons', { name: SAISON_NAME, year: jahr })
  console.log(`Saison angelegt: id=${saison.id} "${saison.name}" (${saison.year})`)

  const gegner = await teamIds(saison.id)
  const spieler = await api('GET', '/api/players')
  const kader = spieler.slice(0, 11).map(p => p.id)

  /*
   * Spieltage im Abstand von zwei Wochen, vier davor und drei danach. Vier vergangene,
   * damit "Letzte Spieltage" und das blasse Ende des Jahresbands etwas zu zeigen haben;
   * drei kommende fuer den Hero und "Anstehend".
   */
  const abstaende = [-56, -42, -28, -14, 7, 21, 35]
  const spieltage = []
  const vergangeneTage = []
  for (const [i, versatz] of abstaende.entries()) {
    const datum = iso(plusTage(heute, versatz))
    const tag = await api('POST', `/api/seasons/${saison.id}/gamedays`, {
      date: datum, gameCount: 2, location: i % 2 === 0 ? 'Bottrop' : 'Essen',
    })
    await api('PUT', `/api/gamedays/${tag.id}/players`, { playerIds: kader })
    const voll = await api('GET', `/api/gamedays/${tag.id}`)
    for (const [j, spiel] of voll.games.entries()) {
      const gegnerId = gegner[(i * 2 + j) % gegner.length]
      const vergangen = versatz < 0
      await api('PUT', `/api/games/${spiel.id}/opponent`, { opponentTeamId: gegnerId })
      if (vergangen) {
        await api('PUT', `/api/games/${spiel.id}/score`, {
          scoreUs: 5 + ((i + j) % 7), scoreThem: 3 + ((i * 2 + j) % 6),
        })
        await api('POST', `/api/games/${spiel.id}/end`)
      }
    }
    spieltage.push(datum)
    if (versatz < 0) vergangeneTage.push(tag.id)
  }
  console.log(`Spieltage angelegt: ${spieltage.length} (${spieltage[0]} … ${spieltage.at(-1)})`)

  /*
   * Die vergangenen Spieltage bekommen Aufstellung und At-Bats, sonst zeigt "Meine Zahlen"
   * in genau der Saison Striche, in der der Spielplan voll ist. Die Verteilung ist gewuerfelt,
   * aber nicht gleichverteilt: wer frueh in der Schlagreihenfolge steht, trifft hier oefter —
   * eine flache Liste aus lauter .300 sieht aus wie ein Platzhalter, und das ist sie dann auch.
   */
  for (const [i, tag] of vergangeneTage.entries()) {
    const voll = await api('GET', `/api/gamedays/${tag}`)
    for (const [j, spiel] of voll.games.entries()) {
      const aufstellung = kader.slice(0, 9).map((id, k) => ({
        playerId: id, position: POSITIONEN[k], battingOrder: k + 1, dhBatterPlayerId: null,
      }))
      await api('PUT', `/api/games/${spiel.id}/lineup`, aufstellung)
      for (let inning = 1; inning <= 4; inning++) {
        for (const [k, id] of kader.slice(0, 9).entries()) {
          const wurf = (i * 37 + j * 13 + inning * 7 + k * 3) % 10
          const trefferGrenze = 5 - Math.floor(k / 3)   // oben in der Reihenfolge haeufiger
          const ergebnis = wurf < trefferGrenze ? SCHLAEGE[wurf % SCHLAEGE.length]
            : wurf < 8 ? 'OUT' : wurf === 8 ? 'WALK' : 'STRIKEOUT'
          /*
           * Punkte nicht an den Homerun haengen: `wurf` bleibt beim Treffer unter 5 und
           * traf damit nie den Homerun am Ende der Liste — die erste Fassung erzeugte
           * 288 At-Bats und NULL Runs, und die Startseite meldete brav "0 geschossen,
           * 60 kassiert". Eine Demo, die so aussieht, taugt nicht zum Hinsehen.
           */
          const punkte = ergebnis === 'HOMERUN' || (TREFFER.has(ergebnis) && (wurf + k) % 3 === 0) ? 1 : 0
          await api('POST', `/api/games/${spiel.id}/atbats`, {
            batterId: id, inning, result: ergebnis, runsScored: punkte, rbi: punkte,
          })
        }
      }
    }
  }
  console.log(`At-Bats geschrieben: ${vergangeneTage.length} Spieltage à 2 Spiele à 36`)

  /*
   * Trainings: Dienstag und Donnerstag, vom Jahresanfang bis zum Jahresende. Zwei Tage
   * die Woche ist das, was die Dead Sox im Sommer tatsaechlich machen — und es fuellt das
   * Jahresband so, dass man die Spieltage darueber noch unterscheiden kann.
   */
  const start = naechsterWochentag(new Date(jahr, 0, 1), 2)
  const trainings = await api('POST', '/api/trainings/bulk', {
    weekdays: [2, 4],
    startDate: iso(start),
    endDate: `${jahr}-12-20`,
    // Map, kein CSV: das DTO erwartet Map<Integer,String> (CreateBulkTrainingRequest).
    weekdayTimes: { 2: '19:00', 4: '20:00' },
    time: '19:00',
    location: 'Halle Welheimer Mark',
    periodName: `Demo ${jahr}`,
    type: 'REGULAR',
  })
  console.log(`Trainings angelegt: ${trainings.length}`)

  return saison.id
}

async function loeschen(saisonId) {
  await api('DELETE', `/api/seasons/${saisonId}`)
  console.log(`Saison ${saisonId} geloescht. Trainings bleiben — die haengen an keiner Saison.`)
  console.log('Die Demo-Trainings liegen in der Periode "Demo <Jahr>" und gehen ueber /training weg.')
}

const args = process.argv.slice(2)
const loeschIdx = args.indexOf('--delete')
if (loeschIdx !== -1) {
  const id = args[loeschIdx + 1]
  if (!id) { console.error('Aufruf: --delete <seasonId>'); process.exit(1) }
  await loeschen(id)
} else {
  const id = await seed()
  console.log(`\nFertig. Saison id=${id}. Rueckbau: node scripts/seed-startseite.mjs --delete ${id}`)
}
