# Spielen mit acht Feldspielerinnen

**Datum:** 2026-08-10
**Status:** Design, noch nicht umgesetzt

## Problem

Mixed Fastpitch schreibt ein Geschlechterverhältnis vor. Steht an einem Spieltag nur eine Frau
zur Verfügung, lässt sich damit keine reguläre Aufstellung stellen — das Team muss mit acht
Spielerinnen antreten oder gar nicht.

Der Spielbogen lässt das nicht zu. `BogenLineupValidator` verlangt mindestens neun Slots:

```
Lineup für HOME muss mindestens 9 Spieler haben (aktuell: 8)   → HTTP 400
```

Empirisch bestätigt: ein Achter-Lineup wird abgelehnt. Der Wizard blockt schon vorher
(`wizardValidation.ts:11`, `filledHome >= 9 && filledAway >= 9`).

Damit ist ein Spiel, das auf dem Platz stattfindet, in der App nicht erfassbar.

## Regel, wie sie gilt

Vom Nutzer festgelegt:

- Es wird mit **acht** Schlagfrauen gespielt.
- Der **freie neunte Platz zählt bei jedem Durchgang als Out**.
- Im Feld bleibt **eine Position unbesetzt** (in der Praxis meist ein Outfielder).

Der zweite Punkt ist der fachliche Kern: der leere Platz verschwindet nicht, er kostet ein Out.

## Was die App dafür schon hat

`AUTOMATIC_OUT` existiert bereits und ist in `docs/SPIELBOGEN.md:48` genau dafür beschrieben
(„fehlende Spielerin"):

- zählt als **ein** Out (`abOutsAdded`, `countWeightedOutsInInning`)
- zählt **weder als At-Bat noch als Plate Appearance** (`AtBatResult.countsAsAtBat()` = false)
- lässt den Base-State unverändert; Backend lehnt `outType`, `fielderChain`, `isError`,
  `sacrificeType`, `runs`, `rbi` und Runner-Advances darauf ab
- erbt Out-Zählung, 3rd-Out-Auto-Switch, Out-Index und Undo vom normalen At-Bat-Pfad
- rendert auf dem Bogen als `AO`

Es ist also kein neues Konzept nötig, nur ein Ort, an dem es entsteht.

**Eine unbesetzte Feldposition ist bereits erlaubt.** `BogenLineupValidator` prüft
Positionswerte nur gegen `VALID_POSITIONS` und verlangt weder Vollständigkeit noch
Eindeutigkeit. Der Wizard erzwingt Positionen ebenfalls nicht. Für Punkt 3 der Regel ist
**keine Änderung** erforderlich — das gehört festgehalten, damit niemand es später als
fehlende Validierung „nachbessert".

## Entwurf: der freie Platz ist ein Slot

Der Reihum-Wechsel läuft über `battingOrder` (`SpielbogenPage.resolveCurrentSlot` /
`nextBatterSlot`, Round-Robin über die vorhandenen Slots). Bei acht Slots geht er von 8
direkt zurück auf 1 — es gibt nichts, wo ein Out entstehen könnte.

Deshalb: **das Lineup behält neun Slots, einer davon ist als frei markiert.**

Damit bleibt vieles unberührt:

| | |
|---|---|
| `battingOrder` | weiter sequenziell 1..N, keine Lücke |
| Round-Robin | unverändert, der freie Platz kommt regulär dran |
| Out-Zählung | unverändert, `AUTOMATIC_OUT` liefert das Out |
| Undo | unverändert, normaler At-Bat-Pfad |
| Bogen | der freie Platz hat eine Zeile, die `AO`-Einträge stehen dort, wo sie hingehören |

**Die verworfene Alternative** wäre gewesen, acht Slots zu speichern und das Out beim
Umbruch synthetisch einzufügen. Dagegen sprechen zwei Dinge: der Scoring-Fluss müsste einen
Batter erfinden, den es in den Daten nicht gibt, und der Bogen hätte keine Zeile für die
entstandenen Outs — auf einem Blatt, das der Liga vorgelegt wird, wäre das eine Lücke.

### Datenmodell

Neues Feld auf `SpielbogenSlot`: `vacant BOOLEAN NOT NULL DEFAULT FALSE`.

Migration `V55__spielbogen_slot_vacant.sql`. Höchste vorhandene Version ist geprüft **`V54`** —
`V55` war kurzzeitig für den entfernten Zuschauer-Link vergeben und ist wieder frei. Vor dem
Schreiben trotzdem nachsehen: liegt lokal noch eine angewandte `V55` in der Datenbank, meldet
Flyway einen Konflikt, und die lokale DB braucht einmal `docker compose down -v`.

Ein Boolean statt einer Namenskonvention (etwa `name = '—'`), weil ein reservierter Name
still bricht, sobald jemand eine Spielerin so nennt, und weil die Bedingung „nur ein freier
Platz" gegen ein Feld prüfbar ist, gegen einen Namen nicht.

### Validierung

`BogenLineupValidator`:

- Minimum bleibt **9 Slots**, Maximum 10 — die Grenzen ändern sich nicht.
- **Höchstens ein** Slot pro Seite darf `vacant` sein. Zwei freie Plätze wären ein Spiel mit
  sieben; das ist nicht die beschlossene Regel und wird abgelehnt.
- Ein `vacant`-Slot braucht **keinen Namen** (die `name`-darf-nicht-leer-Prüfung muss ihn
  ausnehmen) und **keine Position**.
- Ein `vacant`-Slot darf **nicht** `EH` oder `DH` sein — ein freier Platz ist kein Extra
  Hitter.

`wizardValidation.lineupIsValid`: zählt heute befüllte Namen und verlangt neun. Künftig
gilt eine Seite als gültig, wenn Namen **plus** freier Platz neun ergeben, also acht Namen
und ein markierter freier Platz.

### Scoring

Wird der freie Platz zur aktuellen Schlagposition, ist die **einzige verfügbare Aktion das
automatische Out**. Keine Treffer, kein Walk, kein Strikeout — für einen leeren Platz gibt es
nichts davon.

Umgesetzt in `BogenActionButtons`: bei `currentSlot.vacant` treten die üblichen Aktionen
zurück und es erscheint ein einzelner, deutlicher Knopf, der denselben Bestätigungsdialog
öffnet, den das automatische Out heute schon nutzt.

Damit ist das Out faktisch erzwungen, ohne eine Blockade zu bauen: es gibt keinen anderen Weg,
an diesem Platz weiterzukommen. Das ist der Grund, diese Variante der bloßen Empfehlung
vorzuziehen — ein Scorer, der die Aktion überspringen könnte, würde die Out-Zählung des ganzen
Innings verschieben.

### Darstellung

**Bogen (PDF):** Die Zeile des freien Platzes trägt statt eines Namens eine Markierung —
Vorschlag `frei`, kursiv und gedimmt, damit sie nicht wie ein Spielername gelesen wird. Die
Inning-Zellen zeigen `AO` wie bisher. `drawSheet` zeichnet ohnehin zehn Zeilen unabhängig von
der Lineup-Länge, die Zeile existiert also schon; sie bekommt nur einen Inhalt.

**Live-Feed:** Das automatische Out erscheint als normale Ereigniszeile. Ob es als
Nebenereignis gedimmt wird wie Steals und Wechsel, oder wie ein regulärer At-Bat: gedimmt,
denn es ist kein Schlagversuch. `bogenFeed.ts` braucht dafür keinen neuen Zweig, nur die
Einordnung.

**Aufstellungs-Block:** Der freie Platz erscheint mit derselben Markierung, ohne Stift —
dort ist nichts zu bearbeiten außer über den Weg unten.

### Spieler kommt später

Realistischer Fall: die neunte Spielerin trifft im dritten Inning ein.

Vorschlag: der freie Platz wird über den bestehenden Slot-Editor mit einem Namen belegt und
`vacant` fällt weg. Ab dann schlägt an dieser Position eine Spielerin, die vorher entstandenen
`AO`-Einträge bleiben stehen — sie sind ja passiert.

**Das ist die einzige offene Regelfrage in diesem Entwurf**, und sie gehört dem Nutzer:
erlaubt die RFL-Ordnung, einen freien Platz mitten im Spiel zu besetzen? Falls nicht, muss der
Slot-Editor das verweigern, statt es zuzulassen. Bis das geklärt ist, wird der Fall **nicht**
umgesetzt — ein `vacant`-Slot bleibt für das ganze Spiel frei.

## Nicht Teil dieser Arbeit

- Sieben oder weniger Spielerinnen.
- Automatisches Erkennen des Geschlechterverhältnisses oder Warnungen dazu. Die App kennt das
  Geschlecht der Spielerinnen nicht, und der Nutzer hat es nicht verlangt.
- Legacy-Scoring (`ScoringPage`). Dort gibt es eine eigene `AutomaticOutEvent`-Tabelle und
  eine andere Lineup-Validierung; die Regel wird nur im Spielbogen umgesetzt.
- Änderungen an der Positionsvalidierung — sie erlaubt eine leere Position bereits.

## Tests

**Backend**
- `BogenLineupValidator`: acht Namen plus ein `vacant`-Slot ist gültig; zwei `vacant`-Slots
  werden abgelehnt; ein `vacant`-Slot ohne Namen ist gültig; ein `vacant`-Slot mit Position
  `EH` oder `DH` wird abgelehnt; neun echte Namen bleiben gültig; sieben Namen plus ein
  `vacant` (= 8 Slots) wird weiter abgelehnt.
- Mapper-Rundlauf für `vacant` in beide Richtungen — dieselbe Falle wie bei `publicToken`:
  eine einseitige Abbildung verliert das Feld beim Speichern still.
- Integration: Lineup mit freiem Platz setzen, automatisches Out an dieser Position aufnehmen,
  Out-Zählung des Innings prüfen, Undo prüfen.

**Frontend**
- `wizardValidation`: acht Namen plus freier Platz ist gültig, acht Namen allein nicht.
- `BogenActionButtons`: bei `vacant` erscheint ausschließlich das automatische Out und keine
  der übrigen Aktionen. Der Test muss fallen, wenn ein Treffer-Knopf gerendert wird — das ist
  die Zusicherung, dass die Out-Zählung nicht umgangen werden kann.
- `bogenSheetRenderer`: die Zeile des freien Platzes trägt die Markierung, nicht einen leeren
  Namen, und die `AO`-Zellen erscheinen.

**Vor dem Merge**
- `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- `cd frontend && npm test && npm run build && npm run lint`
- `cd frontend && npm run test:e2e`
- Einen echten Bogen mit acht Spielerinnen anlegen, ein Inning durchspielen, das PDF ansehen.
  Diese Regel betrifft das Blatt, das der Liga vorgelegt wird; sie gehört gedruckt geprüft und
  nicht nur im Test.

## Dokumentation

`docs/SPIELBOGEN.md` um die Regel ergänzen, samt der Notiz, dass eine unbesetzte Feldposition
absichtlich nicht validiert wird. In `CLAUDE.md` bei den Domänenregeln die Lineup-Grenzen
korrigieren — dort steht bislang nur die Regel für das Game-Lineup (max 10).
