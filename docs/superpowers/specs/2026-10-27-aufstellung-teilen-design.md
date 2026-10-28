# Aufstellung teilen — Entwurf

*27.10.2026, Entscheidungen ergänzt am 28.10.2026*

## Worum es geht

Wenn die Aufstellung für einen Spieltag steht, holt Hung sie sich heute als PDF, lädt sie
herunter und schickt sie in die Admin-Gruppe, damit die anderen Trainer sie absegnen. Das PDF
ist dabei nur das Transportmittel — der eigentliche Vorgang ist: **ansehen, einverstanden sein,
per WhatsApp Bescheid geben.**

Künftig soll ein **Link** reichen. Wer ihn öffnet, sieht die Aufstellung aller Spiele eines
Spieltags auf einen Blick, mit dem Feld dazu. Die Zustimmung bleibt, wo sie heute auch
stattfindet: in WhatsApp, als Nachricht an Hung. Die App verwaltet keine Freigaben.

## Ziele

- Ein Link statt Herunterladen-und-Verschicken. Im Planer stehen dafür **zwei Knöpfe:
  „Vorschau" öffnet die Seite, „Teilen" gibt den Link weiter.**
- **Alle Spiele eines Spieltags in einer Ansicht** — in der Regel drei.
- **Kein vertikales Scrollen beim Öffnen.** Am Handy muss alles sofort dastehen.
- Je Spiel die Schlagreihenfolge **und** das Feld mit den besetzten Positionen.
- **Auswechslungen und Base-Coach-Rotation gehören dazu — aber als Pfeil, nicht als Satz.**
  Der Inhalt des großen PDFs, in der Schreibweise eines Fahrplans.
- Hinein- und Herauszoomen muss funktionieren — das ist der Weg zum Detail.
- Folgt dem Theme (hell/dunkel), wie der Rest der App.

## Keine Ziele

- **Kein Ersatz für das PDF.** Das bleibt, unverändert. Der Link kommt daneben.
- **Kein Vorschaubild in WhatsApp.** Ausdrücklich verworfen: damit WhatsApp ein Bild zeigt,
  müsste der Link ohne Anmeldung erreichbar sein, und dann sähe ihn jeder, der ihn
  weiterleitet.
- **Keine Zustimmung in der App.** Kein Haken, keine Abstimmung, kein Status.
- **Keine Zustimmung in der App** (siehe oben) — eine **Freigabe** gibt es seit dem
  28.10.2026 aber doch, nur für etwas anderes: sie entscheidet, ob **Spieler** die
  Aufstellung sehen. Für Admins zeigt der Link immer den Live-Stand. Siehe „Freigabe".
- **Keine Bearbeitung auf dieser Seite** und auch kein Weg in den Planer. Wer ändern will,
  geht den Weg, den er heute auch geht.

## Was ein Fehlschlag wäre, auch wenn es technisch läuft

- Man muss scrollen, um zu verstehen, ob die Aufstellung passt. Dann ist nichts gewonnen
  gegenüber dem PDF.
- Das Feld ist hübsch, aber man erkennt nicht, wer wo steht.
- Die Auswechslungen stehen als Fließtext da und man muss sie lesen statt sehen.

**Bewusst in Kauf genommen:** die Seite zeigt den Live-Stand, auch wenn gerade noch
gearbeitet wird. Wer den Link schickt, sagt damit „guck mal drauf" — genau wie heute beim
PDF. Ein Freigabezustand wäre neue Buchhaltung für ein Problem, das es im Team nicht gibt.

---

## Was schon da ist — und das ist viel mehr als gedacht

Beim Gegenlesen hat sich herausgestellt, dass der größere Teil dieses Vorhabens bereits
existiert, nur eben als PDF und im Planer:

**`generateLineupWithFieldPdf` (`utils/pdfExport.ts:393`) macht genau das Gewünschte.**
Schlagreihenfolge 70 mm links, Feld 78 mm rechts, als Block zentriert — die Anordnung, die für
den Handybildschirm ohnehin die einzig mögliche ist (siehe Rechnung unten). Es enthält
obendrein **Auswechslungen** inline („… ab 3. Inning") und die ausformulierten
**Base-Coach-Rotationen** (`resolveRotation`). Der Knopf dafür sitzt in
`GameDayPlanner.tsx:510`.

**`FieldView` (`components/planner/FieldView.tsx`) zeichnet das Feld bereits mit Namen** und
Schlagnummern an den neun Positionen, und zwar als klickbare Schaltflächen für den Planer.
155 Zeilen, fertig.

**Die Daten liegen in einem Abruf bereit.** `GET /api/gamedays/{id}/lineups` liefert
`lineups`, `staff` und `substitutions` nach Spiel-id, `GET /api/gamedays/{id}` Datum, Ort und
die verfügbaren Spieler. **Beide stehen auf `isAuthenticated()`** (`GameDayController.java`),
nicht auf ADMIN — ein Spieler könnte sie heute schon abrufen. Kein neuer Endpunkt nötig,
**und es bleibt dabei** — die Seite ist nicht strenger als der Rest (Entscheidung 1 unten).

Damit ist das Vorhaben im Kern: **vorhandene Teile zu einer Seite zusammensetzen**, nicht einen
Feldzeichner bauen.

## Drei Feldgeometrien im Haus

Es gibt die Koordinaten dreimal:

| Ort | Maßstab | benutzt von |
|---|---|---|
| `playmaker/board/geometry.ts` | Fuß, echtes Maß | Playmaker, `FeldMiniatur` |
| `planner/FieldView.tsx:12` | Prozent (Home 50/70) | Planer |
| `utils/pdfExport.ts:37` | Prozent, identisch | PDF |

Die letzten beiden tragen den ausdrücklichen Kommentar, dass sie übereinstimmen **müssen** —
sonst steht ein Spieler auf dem Papier woanders als auf dem Schirm. **Empfehlung:** die neue
Seite benutzt `FieldView`, also die mittlere. Eine vierte Quelle anzulegen wäre der sicherste
Weg, die drei irgendwann auseinanderlaufen zu lassen. Den PDF-Zweig nicht anfassen — der steht
unter „PDF bleibt außen vor".

## Die Rechnung: passt das ohne Scrollen?

Bei 393 × 760 (typisches Android):

```
  760  Bildschirm
 − 59  Kopfleiste
 − 30  Titel (Spieltag, Datum, Ort)
 − 24  Abstände zwischen drei Blöcken
 ─────
  647  für drei Spiele  →  215 je Spiel
```

Ein Spiel braucht: Überschrift 18, Schlagreihenfolge mit zehn Zeilen à 17 = 170, dazu Bank
und die Coach-Zeile. **Das geht nur auf, wenn Bank und Coaches nicht quer über die ganze
Breite laufen, sondern unter das Feld rutschen:**

```
┌──────────────────────┬──────────────────────┐
│ Spiel 1 · vs Rockets                        │  18
├──────────────────────┼──────────────────────┤
│ 1  Dat          SS   │      ╱╲              │
│ 2  Mike  → Lisa³ 1B  │     ╱  ╲             │  Feld, ~160 × 160
│ …                    │    ╱ ⑤⑥ ╲            │
│ 10 Hung         EH   │   └──────┘           │
│                      ├──────────────────────┤
│                      │ Bank: Tom, Ana       │  14
│                      │ 1B Jan · 3B Dat→Mike │  12
└──────────────────────┴──────────────────────┘
```

Damit kostet ein Spiel **188 Pixel** (18 + 170), und Bank, Coaches und Auswechslungen
kosten **nichts extra** — sie stehen in der Spalte, die links ohnehin leer wäre. Die
Rechnung bleibt dieselbe wie vorher, obwohl mehr Inhalt darauf steht.

Daraus folgt zwingend:

- **Feld und Liste liegen nebeneinander**, nicht übereinander. (Genau wie im PDF.)
- Das Feld bekommt rund 160 Pixel Breite. Darin sind neun Punkte mit **Kürzeln** lesbar,
  ausgeschriebene Namen nicht. `getDisplayName()` in `utils/pdfExport.ts:14` löst das Kürzen
  bereits (Nachname, sonst „H. Lastnam…") und sollte wiederverwendet werden.
- **Der Zoom ist kein Extra, sondern der Weg zum Detail.** Die Seite zeigt die Lage, das
  Hineinzoomen zeigt die Namen. Dafür darf die Viewport-Angabe `user-scalable` nicht sperren
  (in `index.html` prüfen) und keine Geste abgefangen werden.
- Mehr als drei Spiele passen nicht. Bei vieren muss etwas nachgeben — am ehesten die Bank.
- Bei 360 × 740 fehlen rund 40 Pixel. Das ist dieselbe Grenze, die die Startseite schon hat,
  und keine Zusicherung.

## Pfeile statt Sätze

Das große PDF schreibt die Rotation als ganzen Satz aus:

> *3B Coach: **Dat**. **Mike** coacht bei Schlag **#8 – #10**, bis Dat vom Schlag zurück ist.*

Das ist richtig für ein Blatt Papier, das jemand in Ruhe liest — und falsch für 160 Pixel
Breite. Auf der Seite wird daraus **eine Zeile mit einem Pfeil**:

```
1B  Jan            3B  Dat → Mike #8–#10
```

Dieselbe Auskunft, drei Wörter statt zwanzig: wer coacht, wer übernimmt, in welchem Fenster.
Wer den Satz braucht, druckt das PDF — das bleibt ja.

Genauso die **Auswechslung**: sie bekommt keine eigene Zeile, sondern steht im Schlagplatz,
in dem sie passiert.

```
 2  Mike → Lisa³        1B
```

Pfeil heißt „wird zu", die hochgestellte Zahl ist das Inning. Die Daten dafür liegen fertig
vor (`substitutions` mit `playerIn`, `playerOut`, `inning`), `resolveRotation` ebenso — nur
die Schreibweise ist neu. **Diese Kurzschrift ist der eigentliche gestalterische Kern
dieser Seite.** Wenn sie nicht sofort lesbar ist, war die Seite umsonst, und dann ist die
ausgeschriebene Variante der Rückfallweg.

## UX und UI

- **Rangfolge.** Drei gleich große Blöcke nebeneinander geben dem Auge keinen Anfang. Die
  Spielnummer mit Gegner trägt die Orientierung, nicht das Feld — sie gehört deutlich gesetzt,
  das Feld bleibt ruhig.
- **Nummer statt Name auf dem Feld?** Wenn an jeder Position die **Schlagnummer** steht,
  verbinden sich Liste und Zeichnung ohne ein einziges Wort, und das Platzproblem verschwindet.
  `FieldView` hat die Nummer bereits (`order`). Wert, zuerst auszuprobieren.
- **Der leere Fall.** Zwei fertige Spiele und ein leeres darf nicht wie ein Fehler aussehen.
  „Kein Lineup" in ruhiger Schrift, kein Rot. Dasselbe gilt für fehlende Coaches: keine Zeile
  statt einer Zeile mit Strichen.
- **Dunkel.** Das Feld ist eine Strichzeichnung. Im Dunkeln geht die Linie nach oben, nicht
  nach unten — `FieldView` benutzt heute `text-navy-900`, `border-cream-200`,
  `bg-softball-red-600` und müsste auf Tokens umgestellt werden, sonst fällt die Seite durch
  `kontrast.spec.ts`. Die neue Seite gehört in die Seitenliste dieser Prüfung.
- **Der Zoom darf nichts umsortieren.** Wer hineinzoomt, will lesen, nicht neu suchen.
- **Zwei Knöpfe im Planer, nicht einer.** „Vorschau" führt auf die Seite — der Weg, den man
  selbst geht, bevor man etwas verschickt. „Teilen" legt den Link in die Zwischenablage
  (bzw. reicht ihn an die Teilen-Funktion des Geräts weiter), mit kurzer Rückmeldung. Für den
  Test: `fireEvent`, nicht `userEvent` — letzteres ersetzt `navigator.clipboard`.

## Was der Umsetzung überlassen bleibt

- Das Seitenverhältnis von Liste zu Feld.
- Ob auf dem Feld Nummer oder Kürzel steht (Vorschlag oben: Nummer zuerst probieren).
- Ob der Link kopiert oder über die Teilen-Funktion des Geräts weitergereicht wird.
- Das genaue Zeichen für den Pfeil (`→`, `▸`) und für das Inning (hochgestellt oder klein).
- Route und Nachladen folgen dem Muster von `/gameday/:id/export` (`routes.tsx:80`,
  `lazyPages.tsx`).

---

## Entschieden (28.10.2026)

**1. Wer darf den Link öffnen? → Jeder Angemeldete** *(mit der Freigabe als Grenze)*.
Dieselbe Schwelle wie beim bestehenden Aufstellungsbogen `/gameday/:id/export`: hinter der
Anmeldung, ohne Rollenprüfung. Kein `RequireRole`, keine Verschärfung im Backend, keine
Wächter-Tests. Die Daten sind ohnehin schon so erreichbar — eine strengere Seite vor einem
offenen Endpunkt wäre nur Fassade.

**2. Inhalt → das große PDF, in Kurzschrift.**
Auswechslungen und Base-Coach-Rotation sind dabei, aber als Pfeil (siehe oben). Nicht, weil
weniger Inhalt gewollt wäre, sondern weil der ausgeschriebene Satz auf dem Handy niemand
liest.

**3. Entwurfszustand → ~~gar nichts~~ → Freigabe für Spieler** *(am 28.10.2026 geändert)*.
Ursprünglich verworfen. Beim Nachfragen, wer den Link öffnen darf, kam heraus, dass Spieler
die Aufstellung **überhaupt erst sehen sollen, wenn sie steht** — und zwar nicht nur hier,
sondern in der ganzen App. Damit ist die Freigabe kein Beiwerk dieser Seite mehr, sondern
ein eigenes Vorhaben, das dieser Seite vorausgeht. Siehe „Freigabe".

**4. Weg in den Planer → nein** *(mein Vorschlag — widersprich, wenn du es anders willst)*.
Drei Gründe: Erstens sieht die Seite jetzt **jeder** Angemeldete (Entscheidung 1), ein
Bearbeiten-Knopf müsste also rollenabhängig erscheinen — zusätzliche Verzweigung für einen
Weg, den es schon gibt. Zweitens ist der Planer zwei Tipper entfernt; der Knopf spart nichts
Nennenswertes. Drittens, und das wiegt am schwersten: **die Seite soll eine Vorlage zum
Draufgucken sein, keine Werkbank.** Sobald dort ein Stift blinkt, wird aus „sag mir, ob das
passt" ein „mach doch selbst" — und die Abstimmung, um die es geht, findet nicht mehr statt.
Wer wirklich ändern will, schreibt es in die Gruppe, so wie heute.

## Freigabe — was am 28.10.2026 dazukam

**Der Anlass war eine Rückfrage, keine neue Idee.** Auf die Feststellung, dass Spieler die
Aufstellung heute ohnehin sehen (die Karte „Lineup" auf `/spielbetrieb` zeigt die volle
Schlagreihenfolge des nächsten Spieltags), kam die Antwort: **sollen sie nicht — jedenfalls
noch nicht.** Erst wenn sie steht.

Das dreht eine Entscheidung um, die hier schon getroffen war, und es ist mehr Arbeit als
alles andere in diesem Dokument zusammen. Es gehört deshalb in einen **eigenen Plan, der
diesem vorausgeht.**

### Die Regel

| | vor der Freigabe | nach der Freigabe |
|---|---|---|
| **Admin** | sieht alles, immer | sieht alles, immer |
| **Spieler** | sieht **keine** Aufstellung — auch nicht den eigenen Platz | sieht sie wie heute |

„Keine Aufstellung" heißt wirklich keine: auch nicht „du stehst auf Schlagplatz 4". Wer
seinen Platz kennt, kennt die halbe Aufstellung, und wer ihn nicht genannt bekommt, fragt
nicht nach, ob sich noch etwas ändert.

**Die Zusage ist davon nicht betroffen.** „Du bist dabei" kommt aus `availablePlayers` und
beantwortet eine andere Frage — ob ich am Samstag gebraucht werde, nicht wo ich stehe. Die
Karte „Bin ich dabei?" behält also ihren oberen Teil und verliert nur die Zeilen je Spiel
(„Position SS · Schlagplatz 4"), bis freigegeben ist. Beides zu verstecken würde einem
Spieler die Auskunft nehmen, zu der er ausdrücklich ja gesagt hat.

### Die Entscheidungen, die ich getroffen habe

Keine davon ändert, was die Seite leistet — sie legen nur fest, wie die Freigabe sich
verhält. Wer anderer Meinung ist, sagt es, bevor der Plan geschrieben wird.

1. **Freigegeben wird ein Spieltag, kein einzelnes Spiel.** Hung denkt in Spieltagen, die
   Aufstellung entsteht für alle Spiele zusammen, und drei Freigaben für einen Samstag wären
   drei Gelegenheiten, eine zu vergessen.
2. **Ein Zeitstempel, kein Ja/Nein** (`game_day.lineups_released_at`, V73). Kostet dasselbe
   und beantwortet nebenbei die Frage „seit wann steht das", die im ursprünglichen Entwurf
   als eigene Ausbaustufe stand.
3. **Nach der Freigabe sieht man den Live-Stand**, nicht den Stand von damals. Alles andere
   hieße Versionen aufzuheben — ein viel größeres Vorhaben, und niemand hat danach gefragt.
   **Der Trainer erfährt aber, dass sich seit der Freigabe etwas geändert hat** (Zusatz vom
   28.10.2026): ein zweiter Zeitstempel `lineups_changed_at` läuft bei jeder Änderung mit,
   und liegt er nach der Freigabe, sagt die Leiste „Seit der Freigabe geändert". Für Spieler
   ändert das nichts — sie sehen weiter den Live-Stand. Es ist ein Haken für den Trainer
   („der Stand, den ich freigegeben habe, ist nicht mehr der, der dasteht"), keine Sperre.
   **Erneut freigeben** setzt den Haken zurück und sonst nichts.
4. **Zurücknehmen geht.** Derselbe Schalter, beide Richtungen. Eine Freigabe, die man nicht
   rückgängig machen kann, ist eine Falle für den, der sie versehentlich drückt.
5. **Die Grenze liegt im Backend, nicht in der Oberfläche.** Betroffen sind
   `GET /games/{id}/lineup`, `/staff`, `/substitutions` und `/gamedays/{id}/lineups`: für
   Spieler antworten sie vor der Freigabe leer. Eine Sperre nur in der Oberfläche wäre
   Fassade — das Spieler-Dashboard ruft dieselben Endpunkte auf, die jeder Angemeldete
   direkt aufrufen kann.
6. **Die Vorschau-Seite erbt die Regel**, sie baut keine eigene. Ein Spieler, der einen Link
   zu einem nicht freigegebenen Spieltag öffnet, liest „Die Aufstellung steht noch nicht."
7. **Der Zustand ist auch außerhalb des Planers abzulesen** (Zusatz vom 28.10.2026). Sonst
   merkt man das Vergessen erst, wenn jemand fragt. Die Werkbank `/spielbetrieb` trägt den
   Hinweis am nächsten Spieltag — **nur für Admins**, und nur, wenn überhaupt eine
   Aufstellung dasteht. Auf der Startseite `/` steht er **nicht**: die Spieltag-Kachel hat
   kein Höhenbudget mehr (bei 393×760 fehlen heute schon rund 20 Pixel), und eine Zeile
   dort kostet das Versprechen „kein Scrollen".

### Was das kostet

Migration V73, ein Feld durch Entity/Mapper/Modell, ein Endpunkt zum Umschalten, die
Lesegrenze an vier Stellen, der Knopf im Planer, die Karte im Spieler-Dashboard, und die
drei Wächter-Tests (`SecurityCoverageTest`, `MethodSecurityCoverageTest`,
`CurrentUserArchitectureTest`) wollen den neuen Endpunkt eingetragen sehen.

## Größe

Klein. Die Entscheidungen oben haben alles weggeschnitten, was teuer gewesen wäre: keine
Migration, kein Endpunkt, keine Rollenarbeit, keine Wächter-Tests. Übrig bleibt **eine neue
Seite, die vorhandene Teile zusammensetzt**, die Kurzschrift für Auswechslung und Rotation,
`FieldView` auf Theme-Tokens, und zwei Knöpfe im Planer. Nach der Freigabe folgt ein Plan.
