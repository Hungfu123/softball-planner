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

In `BogenActionButtons`: bei `currentSlot.vacant` treten die **At-Bat-Aktionen** zurück
(Treffer, Walk, Strikeout, Aus, Error) und es erscheint ein einzelner, deutlicher Knopf, der
denselben Bestätigungsdialog öffnet, den das automatische Out heute nutzt.

**Einwechslung und Steal bleiben erreichbar.** Das ist keine Feinheit, sondern Bedingung:
`BogenActionButtons` hält `onSubstitution`, `onRecordStealing` und `onAutomaticOut` in derselben
Komponente. Würde man pauschal „alle übrigen Aktionen" ausblenden, verschwände die Einwechslung
mit — und damit der einzige Weg, eine nachgekommene Spielerin auf den freien Platz zu setzen,
genau in dem Moment, in dem der Platz dran ist und man es tun will.

Damit ist das Out faktisch erzwungen, ohne eine Blockade zu bauen: es gibt keinen anderen Weg,
diesen Platz *abzuschließen*. Ein Scorer, der es überspringen könnte, würde die Out-Zählung des
ganzen Innings verschieben.

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

## Risiko für das Bestehende

Die Frage, ob diese Arbeit mehr Fehler ins bestehende System trägt als sie löst, gehört
beantwortet, nicht weggewischt.

**Der wesentliche Schutz ist, dass fast alles additiv ist und hinter `vacant === true` liegt.**
Jeder existierende Bogen bekommt `vacant = false` per `DEFAULT FALSE`, und jede neue Regel
greift nur, wenn das Feld `true` ist. Das Minimum bleibt bei neun Slots — bestehende
Aufstellungen validieren also genau wie vorher, kein Verhalten ändert sich für sie.

Drei Stellen ändern echtes Verhalten und tragen das Risiko:

| Stelle | Risiko | Absicherung |
|---|---|---|
| `wizardValidation.lineupIsValid` | die Bedingung wird umgeschrieben; ein Fehler blockt reguläre 9er/10er-Aufstellungen oder lässt Ungültiges durch | Tests für 9, 10, 8+frei, 8 allein, 7, asymmetrisch |
| `recordSubstitution` (+`vacant = false`) | eine Zeile, die **jede** Einwechslung durchläuft, nicht nur die auf freie Plätze | bestehende Einwechslungs-Tests müssen unverändert grün bleiben |
| `BogenActionButtons` (neuer `vacant`-Zweig) | der Zweig darf den Normalpfad nicht anfassen | Test, dass bei `vacant = false` alle Aktionen unverändert erscheinen |

Alles andere — Spalte, Modell, Entity, Mapper, DTO, TS-Typ, Bogen-Markierung, Feed-Name — ist
Ergänzung ohne Wirkung auf bestehende Daten.

Als Netz darunter: 799 Backend-Tests, 345 vitest-Tests und 77 Playwright-Tests, die alle heute
grün sind. Ein Verhaltensbruch im Normalpfad fällt dort auf.

**Die Umsetzung wird entsprechend geordnet:** erst die additiven Schichten (Migration bis
TS-Typ) mit unverändert grüner Suite, dann die drei verhaltensändernden Stellen einzeln, jede
mit ihrem eigenen Review. Nicht alles in einem Zug, damit ein Bruch dem Commit zuzuordnen ist,
der ihn verursacht hat.

## Randfälle

Durchgedacht vor der Umsetzung. Die ersten sechs ändern das Design, der Rest gehört in Tests.

### 1. Einwechslung muss am freien Platz erreichbar bleiben

Siehe „Scoring". Wäre sie mit den At-Bat-Aktionen ausgeblendet, wäre der Nachzügler-Fall genau
dann unerreichbar, wenn er auftritt.

### 2. `vacant` nur bei genau acht Namen

`8 Namen + 1 frei = 9 Slots` ist der Zweck. Aber `9 Namen + 1 frei = 10 Slots` wäre nach den
Grenzen ebenfalls zulässig — und Unsinn: man spielt mit neun und kassiert trotzdem ein Out je
Durchgang. Ebenso `8 Namen + 1 frei + 1 EH`.

**Regel:** ein `vacant`-Slot ist nur erlaubt, wenn die Seite **genau acht** benannte Slots hat
(Gesamtzahl also neun). Sonst ablehnen. Ohne diese Regel kann sich ein Team versehentlich selbst
ein Out pro Durchgang eintragen.

### 3. `vacant` gehört nicht in `UpdateSlotRequest`

Zunächst waren hier zwei Wächter geplant: PATCH soll `vacant = true` ablehnen, wenn der Slot
schon At-Bats hat, und eine `vacant`-Änderung im Status `LIVE` grundsätzlich ablehnen.

**Beides entfällt.** `UpdateSlotRequest` hat genau drei Felder (`name`, `position`,
`battingOrder`), und der Service wendet jedes nur an, wenn es gesetzt ist
(`SpielbogenSlotService:98-112`). Nimmt man `vacant` dort **nicht** auf, existiert kein
PATCH-Weg dafür — und es braucht keine Regel, die einen Weg verbietet, den es nicht gibt.

Damit ergibt sich von selbst:

- `vacant` wird ausschließlich über `setLineup` gesetzt, und das ist im Status `LIVE` gesperrt
  (`SpielbogenSlotService:64`). Ein freier Platz entsteht also nur vor dem Anpfiff.
- `vacant` fällt ausschließlich über `recordSubstitution`. Genau ein Weg, und der hinterlässt
  den Eintrag im Bogen.

**Ein Wächter bleibt nötig:** PATCH lehnt einen `name` auf einem `vacant`-Slot ab. Sonst könnte
der Stift im Aufstellungs-Block einen Namen setzen, während `vacant` weiter `true` ist — ein
benannter freier Platz. Die Fehlermeldung verweist auf die Einwechslung.

Das ist auch der Grund, `vacant` nicht ins PATCH-DTO zu nehmen, obwohl es „vollständiger"
wirkte: der Stift bearbeitet Slots **während** des Spiels (`BogenSlotEditModal` aus dem Drawer).
Ein Wächter, der dort zu grob prüft — etwa „Payload enthält `vacant`" statt „Wert weicht ab" —
hätte das Umbenennen einer Spielerin mitten im Spiel gesperrt.

### 4. Der freie Platz braucht einen Anzeigenamen

`bogenFeed.ts` löst den Namen über `nameOf(slotId)` auf und fällt bei leerem Namen auf `'—'`
zurück. Im Feed stünde dann `— Automatisches Out`. Der freie Platz braucht stattdessen eine
sprechende Bezeichnung, konsistent mit dem Bogen: **`frei`**.

Damit wird der aufgeschobene Minor-Befund aus der Feed-Arbeit relevant — der `nameOf`-Fallback
hatte keinen Test. Er bekommt jetzt einen, weil er tragend wird.

### 5. `copy-from-gameday` umgeht den Validator komplett

**Der wichtigste Fund dieser Runde.** `SpielbogenSlotService.copyFromGameDay` baut Slots aus dem
Spieltag-Lineup und ruft `slotRepo.saveAll(slots)` direkt — **ohne** `BogenLineupValidator`.

Zwei Folgen:

**Heute schon:** ein Spieltag-Lineup mit acht Einträgen erzeugt einen Spielbogen mit acht Slots,
an der Mindestgrenze vorbei. Die Neun-Regel ist über diesen Weg bereits umgehbar. Das ist eine
bestehende Inkonsistenz, kein neuer Fehler — aber sie trifft genau unseren Fall.

**Für diese Arbeit entscheidend:** das ist der Weg, den der Nutzer im Ernstfall nimmt. Wer mit
acht Spielerinnen anreist, hat auch im Spieltag acht verfügbar und kopiert die Aufstellung in den
Bogen. Ohne Anpassung entstünde dann eine Achter-Aufstellung **ohne** freien Platz — kein
Marker, keine automatischen Outs, keine Warnung. Das gesamte Design würde am wahrscheinlichsten
Weg vorbeigehen.

**Regeln:**

- Hat das Quell-Lineup **genau acht** Einträge, ergänzt `copyFromGameDay` einen neunten Slot mit
  `vacant = true`.
- `copyFromGameDay` ruft anschließend `BogenLineupValidator.validate`, wie der manuelle Weg.
  Sonst gelten die neuen Regeln dort weiterhin nicht.
- Hat das Quell-Lineup sieben oder weniger, schlägt der Kopiervorgang mit der Validator-Meldung
  fehl, statt still eine ungültige Aufstellung zu erzeugen.

### 6. Der Bogen verliert die Markierung nach der Einwechslung

`spielbogenPdfExport.ts:228`:

```
const originalName = subsForSlot.length > 0 ? subsForSlot[0].playerOutName : slot.name
```

Der Primärname der Zeile ist der `playerOutName` der ersten Einwechslung. Bei einem freien Platz
ist der **leer** — die Zeile zeigt dann gar keinen Namen mehr, nur noch `„Name ab 3."` darunter.
Die `frei`-Markierung verschwindet also genau in dem Moment, in dem sie erklären würde, warum
dort vorher automatische Outs stehen.

**Regel:** ist der Slot `vacant` **oder** ist der `playerOutName` der ersten Einwechslung leer,
zeigt die Zeile die Markierung als Primärnamen. Der Bogen liest sich dann als „frei, ab dem 3.
Inning besetzt" — was passiert ist.

### Für Tests, ohne Designfolgen

- **Der freie Platz ist Schlagposition 1.** Dann ist die erste Aktion des Spiels ein
  automatisches Out. `resolveCurrentSlot` liefert bei leerer At-Bat-Liste Slot 1 — sollte
  funktionieren, gehört aber geprüft.
- **Der freie Platz kommt zweimal in einem Inning dran.** Bei einem Durchlauf der ganzen
  Reihenfolge möglich. Dann stehen zwei `AO` in einer Zelle — das ist der Multi-At-Bat-Pfad im
  Bogen, der gerade dreimal wegen Kürzung nachgebessert wurde. Mit `AO AO` unkritisch kurz, aber
  einmal ansehen.
- **Das automatische Out ist das dritte Out.** Löst den Halbinning-Wechsel aus, normaler Pfad.
- **Beide Mannschaften haben einen freien Platz.** Erlaubt, je einer pro Seite.
- **Der freie Platz liegt mitten in der Reihenfolge** (etwa Position 5), nicht am Ende. Zulässig,
  Batting-Order bleibt sequenziell; die Bogen-Zeile erscheint entsprechend in der Mitte.
- **Undo des automatischen Outs.** Danach ist der freie Platz wieder dran und bietet erneut nur
  das Out an.
- **Wizard: Zeile mit getipptem Namen wird als frei markiert.** Der Name muss verschwinden, nicht
  unsichtbar erhalten bleiben.
- **Position war gesetzt, Slot wird frei markiert.** Position muss geleert werden.
- **Manueller Seitenwechsel, während der freie Platz dran ist.** Sein Zug wird dann nicht
  erreicht, es entsteht kein Out. Das ist **richtig** — das Inning endete aus einem anderen
  Grund. Gehört festgehalten, damit es niemand später „behebt", indem er ein Out erzwingt.
- **Einwechslung mit `isPinchHitter` auf einen freien Platz.** Fachlich unsinnig, es schlug ja
  niemand. Sollte `false` sein; wenn der Dialog das Kästchen anbietet, für freie Plätze
  ausblenden.
- **Reset und Wieder-Öffnen.** `/reset` löscht At-Bats, die Aufstellung bleibt — der freie Platz
  überlebt und bietet danach wieder nur das Out an. Ein wieder geöffneter Bogen ebenso.
- **Einwechslung, dann verlässt die Spielerin das Spiel wieder.** Zweite Einwechslung auf
  denselben Slot, normaler Pfad. Der Slot wird **nicht** wieder `vacant` — das ist ausdrücklich
  nicht Teil dieser Arbeit.

### Geprüft und unbedenklich

- **Statistik.** `BattingStatsService` und `BattingStatsCalculator` kennen den Spielbogen nicht —
  kein Weg, über den ein namenloser freier Platz als Phantom-Spielerin in die Auswertung gerät.
- **Datenexport und -import.** `DataExportService` berührt den Spielbogen nicht; das neue Feld
  muss dort nicht mitgeführt werden.

### Bewusst nicht eingeschränkt

**Steals während des freien Platzes.** Streng genommen wird für ein automatisches Out kein Pitch
geworfen, ein Steal ist also unmöglich. Die App modelliert keine Pitches, und eine Sperre wäre
Aufwand für einen Fall, den niemand versehentlich trifft. Bleibt erlaubt.

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
- **neun** Namen plus ein `vacant` (= 10 Slots) wird abgelehnt — `vacant` nur bei genau acht
  Namen (Randfall 2)
- ein `vacant`-Slot mit gesetzter Position wird abgelehnt

**Backend** — Slot-PATCH:
- ein `name` auf einem `vacant`-Slot wird abgelehnt, mit Verweis auf die Einwechslung
  (Randfall 3)
- `UpdateSlotRequest` enthält **kein** `vacant`-Feld — ein Test, der das festhält, verhindert,
  dass es später „zur Vollständigkeit" ergänzt wird und damit einen zweiten Weg aufmacht
- **Regressionsschutz:** Umbenennen eines regulären Slots im Status `LIVE` funktioniert
  unverändert (das ist der Stift im Aufstellungs-Block, ein bestehender Ablauf)

**Backend** — Mapper: Rundlauf für `vacant` in beide Richtungen.

**Backend** — `copyFromGameDay` (Randfall 5):
- Quell-Lineup mit acht Einträgen ergibt acht benannte Slots plus einen `vacant`-Slot
- Quell-Lineup mit neun oder zehn ergibt keinen `vacant`-Slot
- Quell-Lineup mit sieben schlägt mit der Validator-Meldung fehl, statt still zu speichern
- der Validator wird auf diesem Weg überhaupt aufgerufen — heute nicht der Fall

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
- `bogenSheetRenderer` / `spielbogenPdfExport`: die Zeile des freien Platzes trägt die
  Markierung, nicht einen leeren Namen; `AO` und der Out-Index erscheinen in ihren Zellen
- **nach einer Einwechslung auf den freien Platz** trägt die Zeile weiterhin die Markierung als
  Primärnamen, darunter `„Name ab 3."` (Randfall 6). Der Test muss fallen, wenn die Zeile
  namenlos wird — das war das Verhalten vor dem Fix.
- `bogenFeed`: das automatische Out am freien Platz zeigt `frei` als Namen, nicht den
  `—`-Fallback (Randfall 5). Dazu der bislang aufgeschobene Test für den Fallback selbst.
- `BogenActionButtons`: bei `vacant` sind Einwechslung und Steal **weiterhin** erreichbar. Der
  Test muss fallen, wenn die Einwechslung verschwindet — sonst ist der Nachzügler-Fall
  unerreichbar (Randfall 1).

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
