# Spielen mit acht Feldspielerinnen

**Datum:** 2026-08-10
**Status:** Design, freigegeben, noch nicht umgesetzt

## Problem

Mixed Fastpitch schreibt ein Geschlechterverhältnis vor. Steht an einem Spieltag nur eine Frau
zur Verfügung, lässt sich damit keine reguläre Aufstellung stellen — das Team tritt mit acht
Spielerinnen an oder gar nicht.

Der Spielbogen lässt das nicht zu. `BogenLineupValidator` verlangt mindestens neun Slots:

```
Lineup für HOME muss mindestens 9 Spieler haben (aktuell: 8)   → HTTP 400
```

Empirisch bestätigt. Der Wizard blockt schon vorher (`wizardValidation.ts:11`,
`filledHome >= 9 && filledAway >= 9`).

Damit ist ein Spiel, das auf dem Platz stattfindet, in der App nicht erfassbar.

## Regel, wie sie gilt

Vom Nutzer festgelegt:

- Es wird mit **acht** Schlagfrauen gespielt.
- Der **freie neunte Platz zählt bei jedem Durchgang als Out**.
- Im Feld bleibt **eine Position unbesetzt** (in der Praxis meist ein Outfielder).
- Kommt eine neunte Spielerin im Laufe des Spiels dazu, **darf sie den Platz übernehmen** — die
  RFL-Ordnung erlaubt das.

## Lösung: der freie Platz ist ein echter Slot

Das Lineup behält **neun Slots**, einer davon ist als frei markiert. Nicht acht Slots.

### Warum nicht einfach acht Slots

Diese Variante war zunächst vorgesehen — Minimum auf 8 senken, das automatische Out manuell
eintippen, dazu eine Warnung. Sie wurde verworfen, nachdem der Nutzer ihren Preis benannt hat.
Die Begründung gehört hierher, weil sie die zentrale Abwägung dieser Arbeit ist:

Der Reihum-Wechsel läuft über `battingOrder` (`SpielbogenPage.resolveCurrentSlot` /
`nextBatterSlot`, Round-Robin über die vorhandenen Slots). Bei acht Slots springt er von 8
zurück auf 1 — es gibt keinen Moment, an dem ein Out für den fehlenden Platz entstehen könnte.

Das automatische Out wird deshalb dem **aktuellen** Slot zugeordnet
(`SpielbogenPage.tsx:510-512`, `slotId: currentSlot.id`), also der Spielerin, die gerade dran
ist. Auf dem Bogen sieht es aus, als hätte sie das Out gehabt, und ihr echter At-Bat teilt sich
dann die Zelle mit dem Eintrag. Die Out-Zahl stimmt, die Zuordnung nicht — auf einem Blatt, das
der Liga vorgelegt wird.

**Einen Mittelweg gibt es nicht**, das wurde geprüft:

- `spielbogen_at_bat.slot_id` ist `NOT NULL` (`V20`, Zeile 4). Ein Out, das niemandem gehört,
  ist nicht speicherbar.
- Der Out-Index (`I`, `II`, `III`) ist Eigenschaft einer **Zelle**, nicht eines Innings
  (`bogenSheetRenderer.ts:50, 707`) — er wird in der Zelle eines Slots gezeichnet. „Nur in die
  römischen Ziffern schreiben" hat keinen Ort, an dem es stehen könnte.
- `slot_id` nullable zu machen wäre die dritte Möglichkeit. Sie zieht sich durch jede Abfrage
  und jeden Renderer und kostet mehr als der freie Slot, bei schlechterem Ergebnis.

Mit einem markierten Slot bleibt dagegen alles Bestehende unberührt:

| | |
|---|---|
| `battingOrder` | weiter sequenziell 1..N, keine Lücke |
| Round-Robin | unverändert, der freie Platz kommt regulär dran |
| Out-Zählung | unverändert, `AUTOMATIC_OUT` liefert das Out |
| Undo, 3rd-Out-Auto-Switch | unverändert, normaler At-Bat-Pfad |
| Bogen | der freie Platz hat eine Zeile — Out und Ziffern stehen, wo sie hingehören |

## Was gar keine Arbeit ist

**Eine unbesetzte Feldposition ist bereits erlaubt.** `BogenLineupValidator` prüft
Positionswerte nur gegen `VALID_POSITIONS` und verlangt weder Vollständigkeit noch
Eindeutigkeit; der Wizard erzwingt Positionen ebenfalls nicht. Für „im Feld bleibt eine Position
unbesetzt" ist **keine Änderung** nötig. Das gehört festgehalten, damit niemand es später als
fehlende Validierung „nachbessert".

**Das automatische Out braucht keine Änderung.** `docs/SPIELBOGEN.md:48` beschreibt es genau für
diesen Zweck („fehlende Spielerin"): ein Out, weder At-Bat noch Plate Appearance, Base-State
unverändert, Undo und 3rd-Out-Auto-Switch über den normalen At-Bat-Pfad. Backend lehnt
`outType`, `fielderChain`, `isError`, `sacrificeType`, `runs`, `rbi` und Runner-Advances darauf
ab. Rendert als `AO`.

**Eine Warnung gibt es weiterhin**, aber mit anderem Zweck als in der Achter-Variante. Dort
hätte sie erinnern müssen, das Out selbst einzutragen. Hier erklärt sie, **was der markierte
Platz bewirkt** — siehe „Wizard" unten.

## Änderungen im Detail

### Datenmodell

Neues Feld auf `SpielbogenSlot`: `vacant BOOLEAN NOT NULL DEFAULT FALSE`.

Migration `V55__spielbogen_slot_vacant.sql`. Höchste vorhandene Version ist geprüft **`V54`** —
`V55` war kurzzeitig für den entfernten Zuschauer-Link vergeben und ist wieder frei. Liegt lokal
noch eine angewandte `V55` in der Datenbank, meldet Flyway einen Konflikt; dann einmal
`docker compose down -v`.

Ein Boolean statt einer Namenskonvention (etwa `name = '—'`), weil ein reservierter Name still
bricht, sobald jemand eine Spielerin so nennt, und weil „höchstens ein freier Platz" gegen ein
Feld prüfbar ist, gegen einen Namen nicht.

Durchzuziehen durch: Domain-Modell, Entity, Mapper (**beide Richtungen** — eine einseitige
Abbildung verliert das Feld beim Speichern still, dieselbe Falle wie zuletzt bei `publicToken`),
DTO und TypeScript-Typ.

### Validierung

`BogenLineupValidator`:

- Minimum bleibt **9 Slots**, Maximum 10 — die Grenzen ändern sich nicht.
- **Höchstens ein** Slot pro Seite darf `vacant` sein. Zwei freie Plätze wären ein Spiel mit
  sieben; nicht die beschlossene Regel, also ablehnen.
- Ein `vacant`-Slot braucht **keinen Namen** — die „Name darf nicht leer sein"-Prüfung muss ihn
  ausnehmen — und **keine Position**.
- Ein `vacant`-Slot darf **nicht** `EH` oder `DH` sein. Ein freier Platz ist kein Extra Hitter.

### Wizard

`wizardValidation.lineupIsValid` zählt heute befüllte Namen und verlangt neun. Künftig gilt eine
Seite als gültig, wenn Namen **plus** freier Platz neun ergeben.

Der Aufstellungs-Schritt braucht eine Möglichkeit, eine Zeile als frei zu markieren, statt einen
Namen zu tippen — eine Schaltfläche oder ein Kästchen pro Zeile. `WizardStepLineup` rendert
bereits zehn Zeilen (`Array.from({ length: 10 })`), die Zeile existiert also.

Eine als frei markierte Zeile zeigt keine Namens- und keine Positions-Eingabe mehr.

**Warnung**, sobald eine Seite einen freien Platz enthält. Sie muss sagen, was folgt — sonst
steht der Scorer mitten im Spiel vor einem Platz, an dem plötzlich nur noch ein einzelner
Knopf ist, und weiß nicht, warum:

> **Nur 8 Spielerinnen bei {Teamname}.** Platz 9 bleibt frei und zählt bei jedem Durchgang der
> Schlagreihenfolge als Out. Wenn er dran ist, bietet die App das automatische Out an — andere
> Aktionen sind dort nicht möglich.

Drei Eigenschaften, jede mit Grund:

- **Blockiert nicht.** Acht ist eine gültige Aufstellung, kein Fehler. Also der Ton und die
  Farbgebung einer Warnung, nicht einer Fehlermeldung — die Amber-Utilities, die das Projekt für
  Status-Warnungen führt (`styles/index.css:6`), nicht `softball-red`.
- **Nennt den Teamnamen.** Bei einer asymmetrischen Aufstellung (eine Seite acht, die andere
  zehn) ist sonst unklar, welche Mannschaft gemeint ist. Erscheint pro betroffener Seite.
- **Nennt die Folge, nicht nur den Zustand.** „Nur 8 Spielerinnen" allein wäre eine Feststellung,
  die der Scorer selbst sieht. Der Wert liegt im zweiten Satz.

### Scoring

Ist der freie Platz die aktuelle Schlagposition, ist die **einzige verfügbare Aktion das
automatische Out**. Keine Treffer, kein Walk, kein Strikeout — für einen leeren Platz gibt es
nichts davon.

In `BogenActionButtons`: bei `currentSlot.vacant` treten die üblichen Aktionen zurück und es
erscheint ein einzelner, deutlicher Knopf, der denselben Bestätigungsdialog öffnet, den das
automatische Out heute nutzt.

Damit ist das Out faktisch erzwungen, ohne eine Blockade zu bauen: es gibt keinen anderen Weg,
an diesem Platz weiterzukommen. Ein Scorer, der es überspringen könnte, würde die Out-Zählung
des ganzen Innings verschieben.

### Darstellung

**Bogen (PDF):** Die Zeile des freien Platzes trägt statt eines Namens eine Markierung —
Vorschlag `frei`, kursiv und gedimmt, damit sie nicht wie ein Spielername gelesen wird. Die
Inning-Zellen zeigen `AO` und die römischen Ziffern wie bei jedem anderen Out. `drawSheet`
zeichnet ohnehin zehn Zeilen unabhängig von der Lineup-Länge; die Zeile bekommt nur einen
Inhalt.

**Live-Feed:** Das automatische Out erscheint als Ereigniszeile, gedimmt wie Steals und Wechsel
— es ist kein Schlagversuch. `bogenFeed.ts` braucht keinen neuen Zweig, nur die Einordnung.

**Aufstellungs-Block:** Der freie Platz erscheint mit derselben Markierung, ohne Stift.

### Spielerin kommt später

Umgesetzt über den **bestehenden Einwechslungs-Pfad**, nicht über den Slot-Editor:

- `SpielbogenScoringService.recordSubstitution` verlangt nur `playerInName` als nicht leer
  (Zeile 260) und übernimmt `playerOutName` aus dem aktuellen Slot-Namen. Bei einem freien Platz
  ist der leer — zulässig, weil `playerOutName` nicht validiert wird.
- Der Service setzt anschließend `slot.setName(playerInName)` (Zeile 273). Ergänzt wird nur:
  `vacant` auf `false`.
- Der Bogen rendert Einwechslungen als `„{playerInName} ab {inning}."` unter der Zeile
  (`spielbogenPdfExport.ts:254`). Für den freien Platz entsteht damit von selbst die richtige
  Darstellung — Markierung oben, darunter der Name mit dem Inning des Eintritts.

Der Slot-Editor bleibt bewusst außen vor. Über ihn würde der Name still ersetzt, ohne Eintrag im
Bogen und ohne Inning — die Liga sähe nicht, ab wann der Platz besetzt wurde.

Bereits entstandene `AO`-Einträge bleiben stehen. Sie sind passiert, und die Out-Zählung der
betroffenen Innings hängt daran.

## Nicht Teil dieser Arbeit

- **Sieben oder weniger Spielerinnen.**
- **Der umgekehrte Weg:** einen besetzten Platz nachträglich auf `vacant` setzen, weil sich
  jemand verletzt. Dafür genügt das automatische Out am besetzten Platz.
- **Erkennung des Geschlechterverhältnisses.** Die App kennt das Geschlecht der Spielerinnen
  nicht, und es wurde nicht verlangt.
- **Legacy-Scoring** (`ScoringPage`): eigene Validierung, eigene `AutomaticOutEvent`-Tabelle.
  Die Regel wird nur im Spielbogen umgesetzt.

## Tests

**Backend** — `BogenLineupValidator`:

- acht Namen plus ein `vacant`-Slot ist gültig
- zwei `vacant`-Slots werden abgelehnt
- ein `vacant`-Slot ohne Namen ist gültig
- ein `vacant`-Slot mit Position `EH` oder `DH` wird abgelehnt
- neun echte Namen bleiben gültig, zehn ebenfalls, elf weiter abgelehnt
- sieben Namen plus ein `vacant` (= 8 Slots) wird weiter abgelehnt

**Backend** — Mapper: Rundlauf für `vacant` in beide Richtungen.

**Backend** — Integration:
- Lineup mit freiem Platz setzen, automatisches Out an dieser Position aufnehmen, Out-Zählung
  des Innings prüfen, Undo prüfen
- Einwechslung auf einen freien Platz: `playerOutName` bleibt leer, `vacant` fällt auf `false`,
  der Slot trägt danach den Namen, die vorher entstandenen `AO`-Einträge bleiben erhalten — das
  ist die eigentliche Zusicherung dieses Tests

**Frontend**
- `wizardValidation`: acht Namen plus freier Platz gültig, acht Namen allein nicht
- Warnung im Wizard: erscheint bei einem freien Platz mit dem Namen der betroffenen Mannschaft;
  erscheint nicht bei neun oder zehn Namen; erscheint bei acht gegen zehn **nur** für die
  betroffene Seite; der Weiter-Button bleibt aktiv — der Test muss fallen, wenn die Warnung
  blockiert. Das ist die eigentliche Zusicherung: acht ist erlaubt, nicht bloß gewarnt.
- `BogenActionButtons`: bei `vacant` erscheint ausschließlich das automatische Out und keine der
  übrigen Aktionen. Der Test muss fallen, wenn ein Treffer-Knopf gerendert wird — das ist die
  Zusicherung, dass die Out-Zählung nicht umgangen werden kann.
- `bogenSheetRenderer`: die Zeile des freien Platzes trägt die Markierung, nicht einen leeren
  Namen; `AO` und der Out-Index erscheinen in ihren Zellen

**Vor dem Merge**
- `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- `cd frontend && npm test && npm run build && npm run lint`
- `cd frontend && npm run test:e2e`
- Einen echten Bogen mit acht Spielerinnen anlegen, mehrere Innings durchspielen bis der freie
  Platz mindestens zweimal dran war, eine Einwechslung darauf vornehmen, dann das PDF ansehen.
  Diese Regel betrifft das Blatt für die Liga und gehört gedruckt geprüft, nicht nur im Test.

## Dokumentation

`docs/SPIELBOGEN.md`: die Regel aufnehmen, samt der Notiz, dass eine unbesetzte Feldposition
absichtlich nicht validiert wird. In `CLAUDE.md` bei den Domänenregeln die Lineup-Grenzen des
Spielbogens ergänzen — dort steht bislang nur die Regel für das Game-Lineup.
