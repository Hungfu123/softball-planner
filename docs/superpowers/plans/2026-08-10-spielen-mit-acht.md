# Spielen mit acht Feldspielerinnen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Achter-Aufstellung im Spielbogen ermöglichen, indem der fehlende neunte Platz als markierter freier Slot geführt wird, der bei jedem Durchgang ein automatisches Out liefert.

**Architecture:** Ein Boolean `vacant` auf `SpielbogenSlot`. Die Schlagreihenfolge bleibt neun Plätze lang, der Round-Robin unberührt; der freie Platz kommt regulär dran und lässt dort nur das bereits existierende `AUTOMATIC_OUT` zu. Alle neuen Regeln greifen ausschließlich bei `vacant === true`.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Flyway, PostgreSQL 17 (Testcontainers), React 19, TypeScript, Vite 7, Tailwind v4, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-10-spielen-mit-acht-design.md`

## Risikoprofil dieser Arbeit

Der Nutzer hat ausdrücklich die Sorge geäußert, dass dabei Bestehendes kaputtgeht. Der Plan ist
darauf ausgelegt:

**Jede Änderung ist entweder rein additiv oder hängt an `vacant === true`** — einem Feld, das
für jeden existierenden Slot `false` ist. Kein bestehender Datensatz und kein bestehender Ablauf
ändert dadurch sein Verhalten. Das Lineup-Minimum bleibt bei neun Slots.

**Eine Änderung aus der Spec wird bewusst NICHT umgesetzt:** `copyFromGameDay` soll dort den
`BogenLineupValidator` aufrufen, was es heute nicht tut. Das wäre eine Verschärfung eines Pfades,
der heute alles durchlässt — etwas, das jetzt funktioniert, könnte danach mit einem Fehler
abbrechen, im schlechtesten Fall am Spieltag beim Kopieren der Aufstellung. Der Kopierweg wird
nur **ergänzt** (Task 3), nie strenger. Die fehlende Validierung dort bleibt als bestehende
Inkonsistenz dokumentiert und ist ein eigenes Vorhaben.

**Reihenfolge nach Risiko:** erst die additiven Schichten (Task 1), dann die Regeln (Task 2, 3),
dann die drei Stellen mit echter Verhaltensänderung (Task 4, 5), zuletzt Darstellung (Task 6) und
Doku (Task 7). Jeder Task einzeln mit Review, damit ein Bruch dem Commit zuzuordnen ist, der ihn
verursacht hat.

**Netz darunter:** 799 Backend-Tests, 345 vitest-Tests, 77 Playwright-Tests — heute alle grün.
Diese Zahlen sind die Baseline jedes Tasks.

## Global Constraints

- Maven immer mit `-s .mvn/local-settings.xml`. `~/.m2/settings.xml` NICHT anfassen.
- Backend-Tests brauchen einen laufenden Docker-Daemon (Testcontainers).
- Onion-Architektur: `domain` kennt weder Spring-Web, JPA noch DTOs. Ports in `domain/port/out/`,
  Adapter in `adapter/out/persistence/adapter/`.
- Schema-Änderungen nur als neue `V{n}__*.sql`. Höchste vorhandene Version ist **`V54`** — vor
  dem Schreiben mit `ls backend/src/main/resources/db/migration/` prüfen.
- Deutsche UI-Texte und Fehlermeldungen.
- Tailwind v4: Utility-Klassen, keine Arbitrary-Bracket-Syntax für Farben. Farben nur aus den
  Tokens in `frontend/src/styles/index.css`.
- Keine Icon-Bibliothek — eigene SVGs aus `@/icons`.
- Commits: Conventional Commits mit Gitmoji. **Keine `Co-Authored-By`-Zeilen.**
- **Niemals `git add -A` oder `git add .`** — das Arbeitsverzeichnis enthält fremde Scratch-Dateien.
- Die bwrap-Sandbox ist auf dieser Maschine defekt: Bash mit `dangerouslyDisableSandbox: true`
  aufrufen. Ist Docker nicht erreichbar, `DOCKER_HOST=unix:///var/run/docker.sock` exportieren.
- **Spielbogen id 1 und id 143 nicht verändern** — Testdaten des Nutzers bzw. das Demospiel.
  Eigene Wegwerf-Bögen anlegen und danach löschen.

## File Structure

**Backend — neu**

| Datei | Verantwortung |
|---|---|
| `db/migration/V55__spielbogen_slot_vacant.sql` | Spalte `vacant BOOLEAN NOT NULL DEFAULT FALSE` |

**Backend — geändert**

| Datei | Änderung |
|---|---|
| `domain/model/SpielbogenSlot.java` | Feld `vacant` + Accessoren |
| `adapter/out/persistence/entity/SpielbogenSlotEntity.java` | Spalte |
| `adapter/out/persistence/mapper/SpielbogenSlotMapper.java` | beide Richtungen |
| `adapter/dto/SpielbogenSlotResponse.java` | Feld |
| `adapter/dto/SetLineupRequest.java` | Feld im Slot-Teil |
| `adapter/dto/UpdateSlotRequest.java` | **unverändert** — bewusst kein `vacant` |
| `domain/service/BogenLineupValidator.java` | Regeln für `vacant` |
| `application/SpielbogenSlotService.java` | `copyFromGameDay` ergänzt; PATCH lehnt `name` auf `vacant` ab |
| `application/SpielbogenScoringService.java` | `recordSubstitution` setzt `vacant = false` |

**Frontend — geändert**

| Datei | Änderung |
|---|---|
| `types/index.ts` | `vacant` auf `SpielbogenSlotResponse` und im Lineup-Request |
| `components/spielbogen/wizardValidation.ts` | Gültigkeit mit freiem Platz |
| `components/spielbogen/WizardStepLineup.tsx` | Zeile als frei markieren + Warnung |
| `components/spielbogen/BogenActionButtons.tsx` | `vacant`-Zweig |
| `components/spielbogen/BogenLineupAccordion.tsx` | Markierung, kein Stift |
| `utils/bogenFeed.ts` | Anzeigename `frei` |
| `utils/spielbogenPdfExport.ts` | Markierung als Primärname |

---

### Task 1: Spalte und Schichten

Rein additiv. Nach diesem Task muss die gesamte Suite unverändert grün sein — das ist der Beweis,
dass nichts angefasst wurde, was bereits läuft.

**Files:**
- Create: `backend/src/main/resources/db/migration/V55__spielbogen_slot_vacant.sql`
- Modify: `domain/model/SpielbogenSlot.java`, `adapter/out/persistence/entity/SpielbogenSlotEntity.java`,
  `adapter/out/persistence/mapper/SpielbogenSlotMapper.java`, `adapter/dto/SpielbogenSlotResponse.java`,
  `adapter/dto/SetLineupRequest.java`, `frontend/src/types/index.ts`

**Interfaces:**
- Produces: `SpielbogenSlot.isVacant()` / `setVacant(boolean)`; JSON-Feld `vacant` auf
  `SpielbogenSlotResponse` und im Slot-Teil von `SetLineupRequest`; TS-Feld `vacant: boolean`

- [ ] **Step 1: Migration schreiben**

Erst `ls backend/src/main/resources/db/migration/` — ist die höchste Version nicht `V54`, hier
stoppen und melden statt still eine andere Nummer zu nehmen.

```sql
-- Freier Platz in der Schlagreihenfolge: das Team spielt mit acht, der neunte Platz
-- bleibt unbesetzt und zählt bei jedem Durchgang als automatisches Out.
ALTER TABLE spielbogen_slot ADD COLUMN vacant BOOLEAN NOT NULL DEFAULT FALSE;
```

`DEFAULT FALSE` ist wesentlich: jeder existierende Slot bekommt damit den Wert, der sein
bisheriges Verhalten erhält.

- [ ] **Step 2: Feld durch alle Schichten ziehen**

Domain-Modell, Entity (`@Column(nullable = false)`), Mapper **in beiden Richtungen**, DTO,
`SetLineupRequest`, TS-Typ. Dem Stil der Nachbarfelder folgen.

Der Mapper ist die Falle: eine einseitige Abbildung verliert das Feld beim Speichern still. In
diesem Projekt ist das zuletzt bei `publicToken` aufgefallen. `SpielbogenSlotMapper` komplett
lesen, nicht nur die Diff-Stellen — es kann ein geteiltes `applyToEntity` geben, das auch von
einem Update-Pfad genutzt wird.

- [ ] **Step 3: Rundlauf-Test schreiben**

Ein Test, der einen Slot mit `vacant = true` speichert, neu lädt und den Wert prüft. Er muss
fallen, wenn eine Mapper-Richtung fehlt — genau dafür ist er da.

- [ ] **Step 4: Verifizieren**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
cd frontend && npm run build && npm test
```

Erwartung: Backend **800** (799 + der neue Rundlauf-Test), 1 skipped. Frontend **345**, 2 skipped,
unverändert. Jede andere Abweichung hier bedeutet, dass dieser additive Task etwas angefasst hat,
das er nicht anfassen sollte — dann melden, nicht weiterbauen.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V55__spielbogen_slot_vacant.sql \
        backend/src/main/java/com/softball/domain/model/SpielbogenSlot.java \
        backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenSlotEntity.java \
        backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenSlotMapper.java \
        backend/src/main/java/com/softball/adapter/dto/SpielbogenSlotResponse.java \
        backend/src/main/java/com/softball/adapter/dto/SetLineupRequest.java \
        frontend/src/types/index.ts
# plus die neue Testdatei
git commit -m "✨ SpielbogenSlot: Feld vacant für den freien Platz (V55)

Rein additiv, DEFAULT FALSE — bestehende Slots behalten ihr Verhalten.
Noch ohne Regeln und ohne UI."
```

---

### Task 2: Validierungsregeln

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/BogenLineupValidator.java`
- Test: die bestehende Testklasse zu `BogenLineupValidator` (falls keine existiert, neu anlegen —
  vorher mit `find backend/src/test -name "*BogenLineupValidator*"` prüfen)

**Interfaces:** keine Signaturänderung. `validate(List<SpielbogenSlot>, BogenSide)` bleibt.

Alle neuen Ablehnungen greifen nur, wenn mindestens ein Slot `vacant` ist. Für bestehende
Aufstellungen ändert sich nichts — das ist die zentrale Zusicherung dieses Tasks.

- [ ] **Step 1: Tests zuerst**

```java
@Test
void achtNamenPlusFreierPlatzIstGueltig() { /* 8 benannte + 1 vacant → kein Wurf */ }

@Test
void zweiFreiePlaetzeWerdenAbgelehnt() { /* 7 benannte + 2 vacant → BusinessValidationException */ }

@Test
void freierPlatzOhneNamenIstGueltig() { /* name null oder leer auf dem vacant-Slot */ }

@Test
void freierPlatzMitPositionWirdAbgelehnt() { /* vacant + position "LF" */ }

@Test
void freierPlatzAlsEHWirdAbgelehnt() { /* vacant + position "EH" */ }

@Test
void freierPlatzAlsDHWirdAbgelehnt() { /* vacant + position "DH" */ }

@Test
void neunNamenPlusFreierPlatzWirdAbgelehnt() { /* 9 benannte + 1 vacant = 10 Slots */ }

@Test
void siebenNamenPlusFreierPlatzWirdAbgelehnt() { /* = 8 Slots, unter dem Minimum */ }

@Test
void neunEchteNamenBleibenGueltig() { /* Regressionsschutz */ }

@Test
void zehnEchteNamenBleibenGueltig() { /* Regressionsschutz */ }
```

Die letzten zwei sind die wichtigsten: sie belegen, dass bestehende Aufstellungen unberührt sind.

- [ ] **Step 2: Rot sehen**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BogenLineupValidatorTest
```

Die neuen Fälle müssen fallen, die zwei Regressionstests bestehen.

- [ ] **Step 3: Regeln umsetzen**

In `validate`, nach den bestehenden Grenzprüfungen:

- Anzahl der `vacant`-Slots zählen. Mehr als einer → ablehnen.
- Ist genau einer `vacant`: die Anzahl der benannten Slots muss **genau acht** sein, sonst
  ablehnen. Begründung in der Spec, Randfall 2 — sonst kann sich ein Team mit neun Spielerinnen
  versehentlich ein Out pro Durchgang eintragen.
- Die „Name darf nicht leer sein"-Prüfung überspringt `vacant`-Slots.
- Ein `vacant`-Slot mit gesetzter Position → ablehnen (auch `EH` und `DH`, die sind Positionen im
  Sinne von `VALID_POSITIONS`).

Deutsche Meldungen im Stil der bestehenden.

- [ ] **Step 4: Grün sehen**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

Erwartung: alle grün, Zahl gestiegen um die neuen Tests. **Kein bestehender Test darf fallen** —
fällt einer, greift eine neue Regel auf bestehende Daten, und das ist ein Fehler in der Umsetzung.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ BogenLineupValidator: Regeln für den freien Platz

Höchstens einer pro Seite, nur bei genau acht benannten Slots, ohne
Namen und ohne Position. Alle Ablehnungen greifen nur, wenn ein Slot
vacant ist — bestehende Aufstellungen validieren unverändert."
```

---

### Task 3: `copyFromGameDay` ergänzt einen freien Platz

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSlotService.java`
- Test: die Integrationstestklasse, die `copy-from-gameday` abdeckt (mit
  `grep -rln "copy-from-gameday" backend/src/test` finden)

**Warum dieser Task wichtig ist:** wer mit acht Spielerinnen anreist, hat auch im Spieltag acht
verfügbar und kopiert die Aufstellung in den Bogen. Ohne diesen Task entstünde dabei eine
Achter-Aufstellung **ohne** freien Platz — kein Marker, keine automatischen Outs, keine Warnung.
Das gesamte Feature würde am wahrscheinlichsten Weg vorbeigehen.

**Ausdrücklich NICHT Teil dieses Tasks:** `copyFromGameDay` den `BogenLineupValidator` aufrufen
lassen. Der Pfad speichert heute ohne Prüfung (`slotRepo.saveAll`, kein `validate`). Ihn zu
verschärfen könnte etwas brechen, das heute funktioniert — im schlechtesten Fall am Spieltag.
Dieser Task macht den Pfad nur **großzügiger**, nie strenger. Die fehlende Validierung bleibt
als bestehende Inkonsistenz dokumentiert.

- [ ] **Step 1: Test zuerst**

Gegen die API, im Stil der bestehenden Integrationstests:

- Spieltag-Lineup mit **acht** Einträgen kopieren → neun Slots, davon einer `vacant`, Batting-Order
  sequenziell 1..9
- Spieltag-Lineup mit **neun** Einträgen kopieren → neun Slots, **kein** `vacant`
- Spieltag-Lineup mit **zehn** Einträgen kopieren → zehn Slots, kein `vacant`

Der zweite und dritte Fall sind Regressionsschutz: der häufige Weg darf sich nicht ändern.

- [ ] **Step 2: Rot sehen**

Der Achter-Fall muss fallen (acht Slots statt neun), die beiden anderen bestehen.

- [ ] **Step 3: Umsetzen**

In `copyFromGameDay`, nach dem Aufbau der Slot-Liste und **vor** `slotRepo.saveAll`: hat die
Liste genau acht Einträge, einen weiteren Slot anhängen mit `vacant = true`, ohne Namen, ohne
Position, `battingOrder` = 9 und der nächsten freien `slot`-Nummer.

Bei sieben oder weniger Einträgen **nichts** ergänzen — nicht auf neun auffüllen. Eine
Aufstellung mit sieben ist kein Fall, den diese Arbeit abdeckt, und stilles Auffüllen würde ein
Spiel erzeugen, das es nicht geben darf. Der bestehende Zustand (wird ungeprüft gespeichert)
bleibt unverändert.

- [ ] **Step 4: Grün sehen und Gesamtsuite**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ copyFromGameDay: bei acht Einträgen einen freien Platz ergänzen

Das ist der Weg, den ein Team mit acht Spielerinnen tatsächlich nimmt —
Spieltag-Aufstellung in den Bogen kopieren. Ohne diese Ergänzung
entstünde eine Achter-Aufstellung ohne freien Platz.

Der Pfad ruft weiterhin bewusst keinen Validator: er würde damit
strenger als heute, und etwas das funktioniert könnte am Spieltag
abbrechen."
```

---

### Task 4: Wizard — markieren, validieren, warnen

Erste Stelle mit echter Verhaltensänderung für bestehende Abläufe. Entsprechend die
Regressionstests ernst nehmen.

**Files:**
- Modify: `frontend/src/components/spielbogen/wizardValidation.ts`
- Modify: `frontend/src/components/spielbogen/WizardStepLineup.tsx`
- Test: `frontend/src/components/spielbogen/wizardValidation.test.ts` (prüfen ob vorhanden),
  plus ein Komponententest für die Warnung

**Interfaces:**
- Produces: `lineupIsValid` akzeptiert acht Namen plus einen freien Platz; `lineupCounts` liefert
  zusätzlich, ob eine Seite einen freien Platz hat

- [ ] **Step 1: Tests zuerst**

Für `lineupIsValid`:
- acht Namen + freier Platz pro Seite → gültig
- acht Namen ohne freien Platz → **nicht** gültig
- neun Namen → gültig (Regressionsschutz)
- zehn Namen → gültig (Regressionsschutz)
- sieben Namen + freier Platz → nicht gültig
- asymmetrisch (acht + frei gegen zehn) → gültig

Für die Warnung im Wizard-Schritt:
- erscheint bei einem freien Platz, mit dem Namen der betroffenen Mannschaft
- erscheint **nicht** bei neun oder zehn Namen
- erscheint bei acht-gegen-zehn **nur** für die betroffene Seite
- der Weiter-Button bleibt **aktiv** — dieser Test muss fallen, wenn die Warnung blockiert. Acht
  ist erlaubt, nicht bloß gewarnt.

- [ ] **Step 2: Rot sehen**

```bash
cd frontend && npx vitest run src/components/spielbogen/wizardValidation.test.ts
```

- [ ] **Step 3: Umsetzen**

`lineupIsValid`: eine Seite ist gültig, wenn benannte Slots plus ein freier Platz mindestens neun
ergeben und die Regeln aus Task 2 eingehalten sind (höchstens ein freier Platz, nur bei genau
acht Namen).

`WizardStepLineup`: pro Zeile eine Möglichkeit, sie als frei zu markieren. Beim Markieren
verschwinden Namens- und Positionseingabe **und** ein bereits getippter Name wird geleert — nicht
nur ausgeblendet, sonst wandert er beim Speichern mit.

Die Warnung im Wortlaut aus der Spec, Amber (die Status-Warnfarbe des Projekts, siehe
`styles/index.css:6`), nicht `softball-red`. Pro betroffener Seite, mit Teamnamen.

- [ ] **Step 4: Grün sehen und Gesamtsuite**

```bash
cd frontend && npm test && npm run build && npm run lint
```

Erwartung: alle bestehenden 345 weiterhin grün. Fällt ein Wizard-Test, der nichts mit `vacant` zu
tun hat, ist die Bedingung zu streng oder zu locker geworden.

- [ ] **Step 5: Commit**

---

### Task 5: Scoring — Zweig am freien Platz und Einwechslung

Zweite und dritte Stelle mit Verhaltensänderung. Beide klein, beide auf einem heißen Pfad.

**Files:**
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx`
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/main/java/com/softball/application/SpielbogenSlotService.java` (PATCH-Wächter)
- Test: Komponententest für `BogenActionButtons`, Integrationstest für die Einwechslung

- [ ] **Step 1: Tests zuerst**

`BogenActionButtons`:
- bei `currentSlot.vacant`: **nur** das automatische Out unter den At-Bat-Aktionen; kein Treffer-,
  Walk-, Strikeout-, Aus- oder Error-Knopf. Der Test muss fallen, wenn einer davon erscheint.
- bei `currentSlot.vacant`: **Einwechslung und Steal sind weiterhin erreichbar.** Der Test muss
  fallen, wenn die Einwechslung verschwindet — sonst ist der Nachzügler-Fall genau dann
  unerreichbar, wenn er auftritt.
- bei `vacant = false`: **alle** Aktionen erscheinen unverändert. Regressionsschutz für den
  Normalpfad.

Einwechslung (Integration):
- Einwechslung auf einen `vacant`-Slot: `vacant` fällt auf `false`, der Slot trägt den Namen,
  `playerOutName` bleibt leer, bereits vorhandene `AO`-Einträge bleiben erhalten
- **Regressionsschutz:** eine gewöhnliche Einwechslung auf einen benannten Slot verhält sich
  unverändert

Slot-PATCH:
- ein `name` auf einem `vacant`-Slot wird abgelehnt, Meldung verweist auf die Einwechslung
- **Regressionsschutz:** Umbenennen eines regulären Slots im Status `LIVE` funktioniert
  unverändert — das ist der Stift im Aufstellungs-Block, ein bestehender Ablauf
- `UpdateSlotRequest` enthält kein `vacant`-Feld; ein Test hält das fest, damit es später nicht
  „zur Vollständigkeit" ergänzt wird und einen zweiten Weg aufmacht

- [ ] **Step 2: Rot sehen**

- [ ] **Step 3: Umsetzen**

`BogenActionButtons`: Zweig auf `currentSlot.vacant`. **Nur** die At-Bat-Aktionen weichen einem
einzelnen Knopf, der den bestehenden Bestätigungsdialog des automatischen Outs öffnet.
`onSubstitution` und `onRecordStealing` bleiben unangetastet erreichbar.

`recordSubstitution`: nach `slot.setName(playerInName)` zusätzlich `slot.setVacant(false)`. Eine
Zeile, die jede Einwechslung durchläuft — deshalb der Regressionstest oben.

Slot-PATCH: `name` auf einem `vacant`-Slot ablehnen. Kein weiterer Wächter, weil `vacant` nicht
im DTO steht.

- [ ] **Step 4: Grün sehen und beide Gesamtsuiten**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
cd frontend && npm test && npm run build && npm run lint
```

- [ ] **Step 5: Commit** (Backend und Frontend dürfen getrennte Commits sein)

---

### Task 6: Darstellung — Bogen, Feed, Aufstellungs-Block

**Files:**
- Modify: `frontend/src/utils/spielbogenPdfExport.ts`
- Modify: `frontend/src/utils/bogenFeed.ts`
- Modify: `frontend/src/components/spielbogen/BogenLineupAccordion.tsx`
- Test: `bogenFeed.test.ts`, ein Renderer-Test, `BogenLineupAccordion.test.tsx`

- [ ] **Step 1: Tests zuerst**

- `bogenFeed`: das automatische Out am freien Platz zeigt `frei` als Namen, nicht den
  `—`-Fallback. Dazu der bislang aufgeschobene Test für den Fallback selbst — er wird hier
  tragend.
- Bogen: die Zeile des freien Platzes trägt die Markierung, nicht einen leeren Namen.
- Bogen: **nach einer Einwechslung** auf den freien Platz trägt die Zeile weiterhin die
  Markierung als Primärnamen, darunter `„Name ab 3."`. Der Test muss fallen, wenn die Zeile
  namenlos wird — das wäre das Verhalten ohne den Fix, weil `originalName` aus dem leeren
  `playerOutName` kommt (`spielbogenPdfExport.ts:228`).
- `BogenLineupAccordion`: der freie Platz zeigt die Markierung und **keinen** Stift.

- [ ] **Step 2: Rot sehen**

- [ ] **Step 3: Umsetzen**

`spielbogenPdfExport.ts:228`: ist der Slot `vacant` **oder** der `playerOutName` der ersten
Einwechslung leer, die Markierung als Primärnamen setzen. Kursiv und gedimmt, damit sie nicht wie
ein Spielername gelesen wird.

`bogenFeed.ts`: Anzeigename für `vacant`-Slots. Das automatische Out bleibt als Nebenereignis
eingeordnet (gedimmt, kursiv) — es ist kein Schlagversuch.

`BogenLineupAccordion`: Markierung statt Namen, kein Stift.

- [ ] **Step 4: Verifizieren, und diesmal auch ansehen**

```bash
cd frontend && npm test && npm run build && npm run lint
```

Dann einen echten Wegwerf-Bogen mit acht Spielerinnen anlegen, mehrere Innings spielen bis der
freie Platz zweimal dran war, eine Einwechslung darauf vornehmen, das PDF exportieren **über den
echten Browser-Export** (nicht über einen kopflosen Test — dort greift der Notfall-Zweig des
Logos und das Ergebnis täuscht) und ansehen. Danach den Wegwerf-Bogen löschen.

Diese Regel betrifft das Blatt, das der Liga vorgelegt wird. Sie gehört gedruckt geprüft.

- [ ] **Step 5: Commit**

---

### Task 7: Dokumentation

**Files:**
- Modify: `docs/SPIELBOGEN.md`
- Modify: `CLAUDE.md` (**gitignored** — bearbeiten, aber nicht stagen)

- [ ] **Step 1: `docs/SPIELBOGEN.md`**

Die Regel aufnehmen: Achter-Aufstellung über einen als frei markierten Slot, automatisches Out je
Durchgang, Besetzung nur über die Einwechslung. Dazu zwei Notizen, die künftige Arbeit vor
Fehlgriffen bewahren:

- Eine unbesetzte **Feldposition** wird absichtlich nicht validiert — nichts „nachbessern".
- `UpdateSlotRequest` enthält absichtlich **kein** `vacant` — sonst entsteht ein zweiter Weg, den
  Platz zu besetzen, ohne Eintrag im Bogen.
- `copyFromGameDay` validiert weiterhin nicht (bestehende Inkonsistenz, eigenes Vorhaben).

- [ ] **Step 2: `CLAUDE.md`**

Bei den Domänenregeln die Lineup-Grenzen des Spielbogens ergänzen — dort steht bislang nur die
Regel für das Game-Lineup.

- [ ] **Step 3: Commit** (nur `docs/SPIELBOGEN.md`, `CLAUDE.md` ist gitignored)

---

## Abschlussprüfung vor dem Merge

- [ ] `cd backend && ./mvnw test -s .mvn/local-settings.xml` — grün
- [ ] `cd frontend && npm test && npm run build && npm run lint` — grün, Lint 0 Fehler
- [ ] `cd frontend && npm run test:e2e` — 77 Tests; der eine Fehlschlag in
      `plan-edit-swap-drill.spec.ts` ist ein bekannter Datenrace und nicht von dieser Arbeit
- [ ] Ein Achter-Bogen von Hand durchgespielt, Einwechslung darauf, PDF über den echten Export
      angesehen
- [ ] **Ein Neuner- und ein Zehner-Bogen von Hand geprüft** — der Regressionsnachweis, dass der
      übliche Weg unverändert funktioniert. Wichtiger als der Achter-Fall.
- [ ] Alle Wegwerf-Bögen gelöscht; id 1 und id 143 unangetastet
- [ ] **Nicht am Tag vor einem Spiel deployen.** Diese Arbeit berührt den Scoring-Pfad; ein Fehler
      fällt am Spieltag auf, wenn niemand Zeit hat.
