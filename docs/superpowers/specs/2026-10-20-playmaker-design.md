# Playmaker — Plays zeichnen, abspielen, nachlesen

**Datum:** 2026-10-20
**Status:** Design, noch nicht umgesetzt
**Ort in der App:** `/orga/playmaker`

## Warum

Der Trainer erklärt Spielsituationen heute mit dem Fuß im Sand oder mit Worten am
Zaun. Beides ist weg, sobald das Training vorbei ist, und wer gefehlt hat, hat es
nie gesehen. Der Playmaker macht aus so einer Erklärung ein gespeichertes,
abspielbares Play: wer deckt was ab, wohin geht der Ball, wo läuft der Runner.

Zwei Momente zählen:

1. **Am Zaun.** Trainer hält Handy oder Tablet hoch, spielt das Play ab, zeigt mit
   dem Finger drauf. Muss offline gehen, muss in der Sonne lesbar sein, darf keine
   Einarbeitung brauchen.
2. **Zuhause.** Spieler ruft das Play im Planner auf und sieht dieselbe Animation
   noch einmal, mit der Notiz, die der Trainer sonst dazugesagt hätte.

## Ziele

- Trainer baut ein Play in wenigen Minuten auf dem Handy, mit dem Finger.
- Das Ergebnis ist eine **Animation**, kein Standbild mit Pfeilen.
- Plays sind gespeichert, kategorisiert und wiederfindbar.
- Alles funktioniert offline (PWA-Cache), weil der Platz kein WLAN hat.

## Nicht-Ziele

- **Keine Regel-Logik.** Die App weiß nicht, was ein Force Out ist, zählt keine
  Runs, prüft keine Spielsituation auf Gültigkeit. Der Trainer stellt alles selbst
  hin; die App zeichnet stumm, was dasteht. (Ausdrückliche Entscheidung des Users.)
- **Kein Echtzeit-Mitschnitt.** Kein „Aufnehmen, während ich schiebe".
- **Kein Live-Vorführen** im Sinne eines geteilten Miro-Boards („Trainer zeigt
  gerade, alle sehen mit"). Braucht WebSockets und Präsenz-Logik, die das Backend
  heute nicht hat. Eigenes Vorhaben, eigene Entscheidung, später.
- **Kein Feineditor** für Zwischenbilder. Passt ein Stand nicht, stellt man ihn neu.
- **Keine 70 fertigen Situationen** wie bei Softball Instincts. Acht Start-Plays,
  der Rest entsteht im Team.
- **Keine Suche, keine Sortierung, kein PDF-Ausdruck** in der ersten Fassung. Suche
  lohnt ab etwa dreißig Plays.
- **Keine gespiegelten Varianten** (Lefty/Righty).
- **Keine Runs-Zählung.** Stattdessen ein Etikett „Spiellage" am Play.

## Anti-Ziele

Woran das Vorhaben gescheitert wäre, auch wenn es technisch läuft:

- Der Trainer baut lieber wieder mit dem Fuß im Sand, weil das Werkzeug langsamer ist.
- Man muss im Editor scrollen, um an die Werkzeuge zu kommen.
- Die Spieler finden es nicht oder verstehen die Animation ohne Erklärung nicht.
- Es entsteht eine zweite Designsprache neben dem restlichen Planner.

## Prior Art

[Softball Instincts](https://coach.softballinstincts.com/) — Web-Tool, 147 $/Jahr,
englisch. Marker per Drag, Zeichenwerkzeuge, 70+ fertige Situationen, Lese-Zugriff
für bis zu 15 Spieler. Nächster Verwandter. Was die Produktseite **nicht** sagt:
wie Runner und geschlagene Bälle modelliert sind.

Weiter geschaut: *Baseball Board* (iPad, Magnete + Pfeile, statisch), *Baseball
WhiteBoard* (alt), ConceptDraw (generisches Diagrammwerkzeug). Nichts Deutsches,
nichts Softball-Spezifisches, nichts mit Runner und geschlagenem Ball als eigenen
Objekten.

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **Play** | Eine gespeicherte Situation mit Titel, Kategorie, Ausgangslage und 2–12 Ständen |
| **Stand** | Ein vollständiger Schnappschuss des Feldes zu einem Zeitpunkt |
| **Marker** | Ein Objekt auf dem Feld: Verteidiger, Runner oder Ball |
| **Spiellage** | Etikett, für welchen Spielstand dieses Play gilt |

---

## Das Board

### Geometrie — maßstabsgetreu (Fastpitch Damen)

Koordinaten in Fuß, Home im Ursprung, +y Richtung Center Field. Alle Werte gegen
die Regelmaße geprüft.

| Element | Maß |
|---|---|
| Base-Weg | 60 ft |
| Home → 2B | 84,85 ft (60·√2) |
| Pitching-Distanz (Vorderkante Plate → hintere Spitze Home) | 43 ft |
| Pitcher's Circle | 8 ft Radius (16 ft Durchmesser), um die Plate |
| Skinned Infield | **Bogen mit 60 ft Radius um die Pitching Plate** → 103 ft ab Home, also 18 ft hinter 2B; trifft die Foul-Linie bei 82 ft |
| Zaun | 215 ft (Rahmen 200–220 ft) |
| Backstop | 25 ft |

**Nicht maßstäblich, bewusst:** Bases (15 in), Home Plate (17 in), Pitching Plate
(24×6 in) und die Spieler-Marker. Eine Base wäre 0,6 % der Bildbreite, am Handy
zwei Pixel. Der Platz ist maßstabsgetreu, die Objekte darauf sind es nicht — wie
auf einer Seekarte.

**Corner-Bases:** 1B und 3B liegen **komplett im Fair Territory**, ihre Außenkante
bündig an der Foul-Linie. Die als Raute gedrehten Base-Symbole haben Kanten
parallel zur Linie; ihre Mittelpunkte sind um die halbe Kantenlänge nach innen
versetzt. Eine Base wird nie von der Linie durchschnitten.

### Zuschnitt

**Am Desktop und Tablet (≥ 900 px) immer das ganze Feld.** Dort ist Platz, es muss
nichts weggelassen werden, und ein fester Rahmen macht Plays untereinander
vergleichbar. Der inhaltsabhängige Ausschnitt gilt nur am **Handy**, wo das
Geschehen sonst zu klein wird.

Der sichtbare Ausschnitt am Handy richtet sich **nach dem Inhalt**, nicht nach
einem festen Rahmen:

- Umschließendes Rechteck über **alle Marker aller Stände**, plus Home, plus 20 ft Rand.
- Auf das Seitenverhältnis der Fläche aufgezogen. Untergrenze 130 ft Breite,
  Obergrenze das ganze Feld.
- **Home liegt am unteren Rand** (`preserveAspectRatio="xMidYMax meet"`). Dort fängt
  jedes Play an, dort ist der Daumen, und übriger Platz liest sich als Feldtiefe
  statt als Lücke.
- **Fester Zuschnitt je Play, nicht je Stand.** Sonst wackelt die Kamera während der
  Animation.
- Steht in irgendeinem Stand jemand am Foul-Pfosten, wächst das Rechteck bis
  dorthin. Der enge Ausschnitt ist ein Ergebnis, kein Beschnitt.
- Im Editor gilt derselbe Zuschnitt plus Sicherheitsrand, damit man Marker auch
  dorthin ziehen kann, wo gerade keiner steht. Dazu ein Umschalter „ganzes Feld".

**Gras füllt die Fläche randlos.** Kein Papier außerhalb des Zauns, keine
Letterbox-Streifen — das Grün läuft bis an jede Kante der Boardfläche.

**Aufziehen statt beschneiden.** Das umschließende Rechteck wird auf das
Seitenverhältnis der Boardfläche **vergrößert**, nie verkleinert:

```
if (cropAspect < areaAspect)  w = h * areaAspect   // seitlich aufziehen, mittig
else                          h = w / areaAspect   // nach oben aufziehen
scale = Boardbreite / w
```

Damit füllt das Feld seine Fläche vollständig — kein leerer Streifen, keine
Letterbox — und **es geht nichts verloren**. Der Zuwachs ist schlicht mehr Platz,
und Platz ist hier Gras.

Das war ein Umweg im Entwurf: zuerst wurde beschnitten, um zu füllen. Gemessen
fielen dabei bei 390 px Breite 38 ft je Seite weg (LF und RF komplett), mit Deckel
immer noch der Rand — auf dem Desktop war CF halb abgeschnitten. Aufziehen füllt
genauso und kostet nichts.

Umsetzung: `preserveAspectRatio="none"` und ein selbst gerechnetes viewBox, Home
unten verankert (der Zuwachs in der Höhe geht nach oben).

**Gemessen** (Prototyp, vier Größen, keine Überläufe, kein Marker außerhalb):

| Gerät | Boardfläche | Base-Weg | Marker |
|---|---|---|---|
| 320 × 568 | 320 × 336 | 87 px | 26 px |
| 390 × 844 | 390 × 612 | 106 px | 32 px |
| Tablet 834 × 1112 | 834 × 880 | 227 px | 56 px |
| Desktop 1440 × 900 | 1100 × 900 | 232 px | 56 px |

### Desktop und Tablet

Ab **900 px Breite** wird aus der Spalte ein Raster: **Feld links, Leiste rechts**
(340 px). Es wird **nichts gescrollt**, weder senkrecht noch waagerecht.

```
grid-template-columns: 1fr 340px;
grid-template-areas: "board bar" "board note" "board tools" "board time";
```

In der rechten Spalte ist Platz, der am Handy fehlt — dort steht die **Liste der
Stände mit ihren Notizen** untereinander, als Navigation und Überblick zugleich.
Am Handy entfällt sie; dort trägt die Zeitleiste allein.

**Marker-Obergrenze nach Zeigegerät:** 44 px am Finger, **56 px an Maus und
Trackpad** (`pointer: fine`). Dort zählt Lesbarkeit auf Betrachtungsabstand, nicht
die Trefferfläche. Untergrenze bleibt 26 px.

### Marker-Größe

Gemessen, nicht geschätzt (Browser-Probe bei 390×844 und 320×568):

- **Sichtbarer Durchmesser = 30 % der Base-Weg-Länge auf dem Schirm**, mindestens
  26 px, höchstens 44 px.
- **Trefferfläche immer 44 px**, unsichtbar größer als der Marker.
- Bei 320 px Gerätebreite: Base-Weg 96 px, Marker 28,8 px. Mit starren 44 px wären
  es **46 % des Base-Wegs** — das Infield verstopft, 3B verschwindet hinter Runner
  und Ball. Das war im ersten Entwurf so und ist der Grund für die Regel.
- Ball = 42 % des Marker-Durchmessers.
- **Z-Reihenfolge:** Verteidiger, dann Runner, dann Ball. Der Ball liegt immer oben.

### Farben

| Rolle | Wert | Herkunft |
|---|---|---|
| Gras (Platzfläche) | `#93B268` | neu |
| Außerhalb des Zauns | `cream-100 #FBF6EC` | Theme |
| Skinned Infield | `#E3C9A4` | neu |
| Foul- und Zaunlinien | `#FFFFFF` | — |
| Platz-Inventar (Bases, Home, Pitching Plate) | `cream-50 #FBF6EC`, Kontur `navy-800 #10133F` 0,4 | Theme |
| Verteidiger | `navy-800 #10133F`, Kürzel in `cream-50` | Theme |
| Runner | `softball-red-700 #B91C2A` | Theme |
| Ball | Optic Yellow `#E6F03C` | neu |
| Flugbahn | Optic Yellow, gestrichelt 5/4, Stärke 2,4 | — |
| Laufweg | `softball-red-700`, Stärke 2,6 | — |
| Pitcher's Circle | `cream-50` bei 22 % Deckkraft | — |

Drei neue Farben: Gras, Sand, Optic Yellow. Alles andere steht im Theme.

### Form-Grammatik

**Kreis** = Verteidiger (mit Positionskürzel) · **Raute** = Runner · **Punkt** = Ball.
Form trägt die Bedeutung, Farbe verstärkt sie nur. Nötig, weil Rot und Gelb
zueinander nur 2,17 messen und bei Deuteranopie auf 2,00 fallen.

### Kontur-Regel

> **Platz-Inventar trägt eine 0,4er Navy-Haarlinie. Alles Bewegliche trägt keine.**

Begründung: Cream auf Sand misst 1,48 — zu wenig für Home, Bases und Plate. Mit
Haarlinie 11,08. Marker, Runner und Ball brauchen sie nicht (7,42 / 2,70 / 1,92–2,68).

### Bekannte Schwachstelle, bewusst gewählt

Der gelbe Ball misst auf dem Sand **1,28**. Ein Schatten würde das lösen, wurde vom
User abgelehnt. Die Alternative — dunkleres Infield — hätte den Runner auf 1,94
gedrückt, und der ist im Infield zuhause, während der Ball meistens im Gras liegt
(dort 1,92). Der seltenere Fall wurde geopfert.

### Gemessene Werte (Referenz)

| Paarung | Normal | Protanopie | Deuteranopie |
|---|---|---|---|
| Gras / Sand | 1,49 | — | — |
| Verteidiger auf Gras | 7,42 | — | — |
| Verteidiger auf Sand | 11,08 | — | — |
| Kürzel im Verteidiger | 16,42 | — | — |
| Runner auf Sand | 4,03 | — | — |
| Runner auf Gras | 2,70 | — | — |
| Ball auf Gras | 1,92 | — | 1,94 |
| Ball auf Sand | 1,28 | — | — |
| Weiße Linie auf Gras | 2,38 | — | — |
| Runner neben Verteidiger | 2,75 | 2,23 | — |

---

## Datenmodell

### Play

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long | |
| `title` | String | Pflicht |
| `categoryId` | FK → `play_category` | Pflicht |
| `gameState` | Enum | `ANY`, `CLOSE_LATE`, `AHEAD`, `BEHIND` — Vorgabe `ANY` |
| `gameStateNote` | String, optional | ein Satz, warum; nur sichtbar wenn ≠ `ANY` |
| `counterpartPlayId` | FK → `play`, optional | „Gegenstück" für dieselbe Situation in anderer Lage |
| `createdAt`, `updatedAt` | Timestamp | |

Ausgangslage (Runner auf welchen Bases, Outs) ist **kein eigenes Feld** — sie ist
der erste Stand. Für Liste und Vorschau wird sie daraus abgeleitet.

### PlayStep (Stand)

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long | |
| `playId` | FK | |
| `ordinal` | int | 1..N, lückenlos |
| `durationMs` | int | 600 / 1200 / 2000 |
| `note` | String, optional | wird beim Abspielen eingeblendet |
| `outs` | int 0–3 | je Stand änderbar; 3 erlaubt, damit ein Play mit dem dritten Out enden darf |
| `markers` | JSON | siehe unten |

`markers` als JSON-Spalte, nicht als Relation: neun Verteidiger, bis zu vier Runner
und ein Ball sind ein Dokument, das immer vollständig gelesen und geschrieben wird.
Einzelne Marker werden nie abgefragt.

```json
{
  "defenders": [ { "pos": "SS", "x": 128.0, "y": 140.5 }, ... ],
  "runners":   [ { "id": "r1", "x": 196.0, "y": 174.2, "status": "ACTIVE" }, ... ],
  "ball":      { "state": "IN_HAND", "holder": "RF", "x": 245.0, "y": 62.0,
                 "trajectory": "AIR" }
}
```

**Koordinatensystem, verbindlich:** `x`/`y` sind **Board-Einheiten**, nicht Fuß und
nicht Pixel. Eine Einheit entspricht einem Fuß, der Ursprung liegt oben links, **y
zeigt nach unten** (SVG-Konvention), Home liegt bei `(155, 218)`. Die Maßtabelle
oben beschreibt dieselbe Geometrie in Fuß mit Home im Ursprung — das ist die
Herleitung, nicht das Speicherformat. Umrechnung: `x_board = 155 + x_ft`,
`y_board = 218 − y_ft`.

Das gespeicherte Koordinatensystem ist **fest**. Der Zuschnitt verändert nur das
gerenderte viewBox, nie die Daten. Entsprechend rechnet die Marker-Formel mit der
**Zuschnittbreite**, nicht mit einer festen 310.

`status` eines Runners: `ACTIVE`, `OUT`, `SCORED`.

### Ballzustände

| Zustand | Darstellung |
|---|---|
| `AT_BAT` | Ball beim Pitcher, kein Play im Gang |
| `IN_HAND(pos)` | Kugel an der Kante der Scheibe, **keine** Linie |
| `IN_FLIGHT` | Linie vom Ort im vorigen Stand zum Ort in diesem |
| `LOOSE` | Kugel liegt frei (Fehler, Overthrow, Passed Ball) |

`trajectory`: `AIR` (Bogen) oder `GROUND` (gerade).

### Die Linie wird abgeleitet, nicht gespeichert

Das ist der Kern des Modells. Die sichtbare Flugbahn ist immer die Bewegung vom
**vorigen** zum **aktuellen** Stand. Dadurch verschwindet die Schlaglinie von
selbst, sobald der Fielder wirft — sie gehörte zum vorigen Schritt. Dasselbe gilt
für Laufwege.

In der Spieleransicht bleibt die **vorige** Bahn blass stehen (35 % Deckkraft),
weil bei Cut-off-Ketten die Kette der Inhalt ist, nicht der einzelne Wurf. Im
Editor nicht — dort stört sie beim Zielen.

### PlayCategory

| Feld | Typ |
|---|---|
| `id` | Long |
| `name` | String, unique **case-insensitive** |
| `sortOrder` | int |

Vom User anlegbar, umbenennbar, zusammenführbar. Beim Anlegen eines Plays wählt
man aus der Liste; „Neue Kategorie" steht unten im Auswahlfeld. Die
Unique-Prüfung verhindert „Cutoff" neben „cut off".

Startsatz (per Migration): Cut-off & Relay · Bunt-Defense · Rundown ·
First-and-Third · Pop-up-Priorities · Steal-Defense & Pickoff · Base-Coverage ·
Sonstiges.

### Migrationen

- `V66__play_category.sql` — Tabelle + Startsatz
- `V67__play.sql` — `play` und `play_step`
- `V68__seed_plays.sql` — acht Start-Plays, **einmalig**, nicht als Startup-Seed.
  Gelöschte Plays dürfen nicht wiederkommen. Sie sind normale Plays ohne Sonderstatus.

---

## Edge Cases

### Ball

| Fall | Verhalten |
|---|---|
| Wurf geht ins Leere | Ball `LOOSE` an Koordinate, Runner laufen weiter |
| Fielder verfehlt den Fly | `LOOSE` statt `IN_HAND` |
| Rundown | Ball pendelt zwischen zwei Fieldern, viele kurze Stände |
| Ball im Pitcher's Circle | Normaler `IN_HAND`-Stand; der Kreis ist nur Kulisse (keine Look-Back-Logik) |
| Foul Ball | Ball verlässt Fair Territory, Play endet mit diesem Stand |
| Ball liegt auf einem Verteidiger | Kugel wird an die **Kante** der Scheibe gesetzt, nicht in die Mitte — sonst verschwindet sie (keine Kontur) |
| Zwei Bälle | Unmöglich, das Modell hat genau einen |

### Runner

| Fall | Verhalten |
|---|---|
| Kontakt | Batter-Runner erscheint an Home. Vorher existiert er nicht |
| Lauf zwischen zwei Bases | Interpolation **entlang der Base-Wege**, nicht Luftlinie. Wer von 1 nach 3 läuft, muss über 2 |
| Tag Up | Zwei Stände: zurück zur Base, dann vor |
| Out | `status: OUT`, Marker wird durchgestrichen dargestellt und fehlt im nächsten Stand |
| Run | Runner läuft über Home hinaus, `status: SCORED`, verschwindet. **Kein Zähler** |
| Zwei Runner auf einer Base | Erlaubt. Die App prüft nichts (Nicht-Ziel) |
| Runner überholt Vordermann | Erlaubt. Siehe oben |
| Mehr als vier Runner | Durch die Oberfläche verhindert (drei Bases + Batter) |

### Bauen

| Fall | Verhalten |
|---|---|
| Neuer Stand | Entsteht als **Kopie des aktuellen**. Pflicht, nicht Komfort — sonst stellt man neun Marker jedes Mal neu |
| Stand löschen | `ConfirmModal` (Hausregel), danach `ordinal` neu durchnummeriert |
| Stand verschieben | Erlaubt, `ordinal` wird neu vergeben |
| Standard-Aufstellung | Ein-Tipp-Reset auf die neun Normalpositionen |
| Erster Stand löschen | Erlaubt, solange mindestens einer bleibt |
| Weniger als 2 Stände | Play speicherbar, aber Abspielen zeigt nur das Standbild |
| Mehr als 12 Stände | Weicher Hinweis, keine harte Grenze |
| Abspielen im Editor | Über `▶` in der Wiedergabeleiste, ohne die Ansicht zu verlassen |
| Sichern | Automatisch, entprellt. Der Kopf zeigt „Gesichert" / „Sichert…" |
| Rückgängig | Fünf Stufen, nur Marker-Bewegungen und Ball-Setzen |
| Play duplizieren | Nötig für das Gegenstück in anderer Spiellage — kopieren, zwei Stände ändern |
| Play umbenennen, Kategorie ändern | Setup erneut öffnen |
| Play löschen | `ConfirmModal` |
| Runner im Setup entfernen | Base nochmal antippen |
| Leerzustand | CrossBones, ein Satz, „Erstes Play anlegen" |
| Offline und nie geladen | Ein Satz statt eines leeren Feldes |

---

## Oberfläche

Vier Ansichten, alle in Handybreite entworfen, weil sie am Zaun benutzt werden.

### 1. Übersicht (`/orga/playmaker`)

Oben das zuletzt bearbeitete Play **groß als Feld** mit Titel und Meta-Zeile im
Verlauf darüber — man landet auf dem Ding selbst, nicht auf einer Filterleiste.
Darunter ein Auswahlfeld für die Kategorie (nicht eine Reihe Pillen; verträgt
beliebig viele) und die Liste als ruhige Zeilen mit Trennlinie: Vorschau,
Titel, Meta. Die Vorschau ist der **erste Stand** des Plays, kein Symbol.

Die Spiellage erscheint als einzige Pille in der Zeile, und nur wenn sie von „jede
Lage" abweicht.

Leerzustand nach Hausregel: CrossBones-Icon, ein Satz, CTA.

### 2. Setup (neues Play)

Titel (Platzhalter statt Überschrift), Kategorie, Spiellage. Das
Begründungsfeld der Spiellage erscheint erst, wenn etwas anderes als „jede Lage"
gewählt ist.

Ausgangslage: **Base antippen setzt einen Runner.** Leere Bases zeigen einen
gestrichelten Ring als Einladung. Outs als drei Punkte. Kein Formular, keine
Zahlenfelder.

### 3. Editor

Höhenbudget, `h-dvh`, **kein vertikales Scrollen**:

| Bereich | Höhe |
|---|---|
| Kopf (Titel, Sicherungsstatus, Outs) | 52 px |
| Feld | Rest, schrumpfbar |
| Notiz, einzeilig, antippbar für mehr | 40 px |
| Werkzeuge (Ziehen · Ball · Runner · Rückgängig) | 54 px |
| Wiedergabeleiste (Zeitleiste + Knöpfe) | 55 px |
| Systemleiste unten | 16 px |
| **Fest** | **266 px** |

Das Feld bekommt `flex-1 min-h-0` und `preserveAspectRatio="xMidYMax meet"`, wird
also kleiner statt beschnitten.

**Im Browser gemessen** (`h-dvh`, `overflow:hidden` auf `html, body`):

| Gerät | Feldfläche | Anteil am Schirm | Scrollt |
|---|---|---|---|
| 390 × 844 | 390 × 618 px | 73,2 % | nein |
| 320 × 568 | 320 × 342 px | 60,2 % | nein |

Passt auf beiden, auf dem kleinen ohne Reserve. Deshalb bleibt die Notiz einzeilig,
und der inhaltsabhängige Zuschnitt ist keine Kür — er ist das, was auf kleinen
Geräten überhaupt ein brauchbares Feld übrig lässt.

Es gibt **keine Speichern-Leiste** — sie kostete 56 px und entschied damit über
Scrollen oder nicht. Stattdessen Autosave.

**Marker werden in Bildschirm-Pixeln skaliert, nicht in Feld-Einheiten**, damit sie
immer ~44 px Trefferfläche haben. Konkret: Radius in viewBox-Einheiten =
22 / Boardbreite_px · 310. Auf einem schmalen Handy sind das ~19 Einheiten, auf dem
Tablet ~8.

**Ziehen:** der gegriffene Marker springt **über die Fingerkuppe** und wird größer;
ein heller Ring markiert die echte Ablegestelle. Sonst zielt man blind unter dem
eigenen Daumen. Runner rasten an Bases und am Base-Weg ein, Verteidiger sind frei,
der Ball rastet an Verteidigern ein.

**Zeitleiste als durchgehender Schieberegler**, nicht als Reihe nummerierter
Pillen und nicht als Segmente mit Lücken: eine Spur in `cream-200`, navy gefüllt bis
zum aktuellen Stand, runder Knopf, je Stand ein kleiner heller Punkt als Teilstrich.
Bleibt gleich breit bei drei wie bei fünfzehn Ständen und sieht aus wie jeder andere
Regler. Wischen über dem Feld wechselt den Stand. Langdruck auf einen Teilstrich
öffnet ein Sheet mit Duplizieren und Löschen (`ResponsiveSheet`, portalt nach
`body`).

**Werkzeugzeile:** Ziehen · Ball · Runner · **Rückgängig**. Fünf Stufen Undo;
Fingerbedienung produziert Fehlgriffe, und ohne Rückgängig baut man ständig neu.

**Wiedergabeleiste im Editor:** `+ Stand` (legt den nächsten als Kopie an) ·
Zählung · **Dauer dieses Stands** (0,6 / 1,2 / 2,0 s, Tippen wechselt) · `▶` zur
Probe. Die Dauer gehört hierhin, weil man sie direkt nach dem Bauen beurteilt.

**Zählung:** „Stand 2 von 7" mit `white-space: nowrap`, Knöpfe mit `flex-shrink: 0`.
Unter 340 px Gerätebreite verkürzt sich der Text auf „2/7". Die Zeile braucht
268 px; auf 375 px Gerätebreite stehen 347 zur Verfügung.

**Querformat:** Leisten wandern nach rechts, das Feld nimmt die volle Höhe.

### 4. Spieleransicht

Kein Werkzeug. Feld, Notiz, Wiedergabeleiste. Die Outs stehen als drei Punkte im
Kopf — **keine Meta-Pillen**, weil das Feld die Situation schon zeigt. Darunter,
wenn vorhanden, der Verweis aufs Gegenstück: dieselbe Situation, andere Spiellage,
andere Entscheidung.

Wiedergabeleiste: `◀` · `❚❚` · `▶` · Zählung · **`↻` Schleife** · **Tempo `1×`**
(Tippen wechselt 0,5× / 1× / 2×). Alle 44 px.

- Die **Schritt-Knöpfe** sind nötig, weil man beim Erklären blättert statt
  abzuspielen. Vorher war das nur per Wischen erreichbar, also unsichtbar.
- Die **Schleife** lässt das Play weiterlaufen, während der Trainer redet.
- Im Kopf ein **„?"**, das die Legende als Sheet öffnet: Kreis ist Verteidiger,
  Raute ist Runner, Punkt ist Ball, gestrichelt ist der Ball, durchgezogen der
  Läufer. Ein Spieler sieht das Board zum ersten Mal ohne den Trainer daneben.

**Nicht** in die Leiste: Teilen, Legende, Gegenstück, Kategorie. Sie gehört der
Wiedergabe — alles, was man einmal pro Play braucht statt einmal pro Sekunde,
liegt im Kopf oder unter der Notiz.

### Tempo

| Vorgang | Dauer |
|---|---|
| Übergang zwischen zwei Ständen (Vorgabe) | 1200 ms |
| Je Stand umstellbar | 600 / 1200 / 2000 ms |
| Halt am Ende jedes Stands | 400 ms |
| Play mit vier Ständen | ≈ 6,4 s |
| Marker greifen (Anheben) | 150 ms |
| Stand wechseln per Tipp | 250 ms |

**Alle Objekte bewegen sich im selben Takt**, obwohl ein Wurf real zehnmal schneller
ist als ein Fielder-Schritt. Maßstäblich wäre der Ball weg, bevor jemand hinsieht,
und die Gleichzeitigkeit — um die es geht — nicht erkennbar.

### Bewegung (Emil Kowalski)

Genau **ein inszenierter Moment**: der Übergang zwischen zwei Ständen. Er ist das
Produkt. Alles andere antwortet nur auf eine Handlung — Marker hebt sich beim
Greifen, Segment drückt sich beim Tippen (`button:active { scale(.95) }` erbt die
App bereits). **Keine** Einblend-Animationen auf Listenzeilen, keine Hover-Effekte
auf Karten.

Kurven: Verteidiger und Runner mit `--ease-in-out-strong` (Menschen beschleunigen
und bremsen), der Ball nahezu linear mit weichem Auslauf beim Fangen. Tippen aufs
Feld hält die Wiedergabe sofort an.

Bei `prefers-reduced-motion` springt die Wiedergabe von Stand zu Stand, mit dem
400-ms-Halt. Der Inhalt bleibt vollständig, nur die Bewegung fällt weg.

### Schrift

Big Shoulders Display für Seitentitel, Archivo für Fließtext und Notizen,
tabellarische Ziffern für „Stand 3 von 4" und die Meta-Zeilen. Keine Sonderschrift
auf dem Board; die Positionskürzel laufen in Archivo Bold.

---

## Backend

Onion wie im Rest des Projekts. Keine Schichtverletzungen.

```
domain/model/          Play, PlayStep, PlayMarkers, PlayCategory, BallState, GameState
domain/port/out/       PlayRepository, PlayCategoryRepository
application/           PlayService, PlayCategoryService
adapter/in/web/        PlayController, PlayCategoryController
adapter/dto/           PlayRequest/Response, PlayStepRequest/Response, ... (Records)
adapter/out/persistence/  PlayEntity, PlayStepEntity, PlayCategoryEntity,
                          Mapper, PlayRepositoryAdapter, PlayCategoryRepositoryAdapter
```

Endpunkte:

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/plays` | **Vollständige** Plays inklusive aller Stände, optional `?categoryId=` |
| `GET` | `/api/plays/{id}` | Einzelnes Play |
| `POST` | `/api/plays` | Anlegen |
| `PUT` | `/api/plays/{id}` | Vollständig ersetzen, inklusive Stände |
| `DELETE` | `/api/plays/{id}` | Löschen |
| `GET` | `/api/play-categories` | Liste |
| `POST` | `/api/play-categories` | Anlegen |
| `PUT` | `/api/play-categories/{id}` | Umbenennen |
| `POST` | `/api/play-categories/{id}/merge/{targetId}` | Zusammenführen |
| `DELETE` | `/api/play-categories/{id}` | Nur wenn leer |

Validierung in `PlayValidator` (Domain): `ordinal` lückenlos 1..N, mindestens ein
Stand, `outs` 0–2, `durationMs` aus der erlaubten Menge, Kategorie existiert,
`counterpartPlayId` ≠ eigene id. **Keine** Softball-Regelprüfung —
das ist ausdrücklich Nicht-Ziel. Verstöße → `BusinessValidationException` → 400.

`PUT` ersetzt die Stände vollständig (delete + insert in einer Transaktion), weil
der Editor ohnehin den ganzen Play hält. Kein PATCH je Stand.

## Frontend

- Route `/orga/playmaker` (Übersicht), `/orga/playmaker/:id` (Spieleransicht),
  `/orga/playmaker/:id/bearbeiten` (Editor), `/orga/playmaker/neu` (Setup).
- Kachel in `OrgaHome.tsx` neben Einladungen, Aufbau, WhatsApp-Umfrage,
  Trainerabrechnung, Counter, Kalender.
- Zustand in `usePlays` und `usePlayEditor`. Komponenten bleiben darstellend.
- Lazy-Loading plus `Suspense` und `ChunkErrorBoundary` wie bei Scoring und Stats.
- **Gegenstück** wird im Setup gewählt (Liste der Plays derselben Kategorie).
  Beziehung **einseitig**; beim Löschen des Ziels `ON DELETE SET NULL`.
- Das Board als eigene Komponente `PlayBoard`, einmal für alle vier Ansichten,
  gesteuert über Props (`interactive`, `showGhostPath`, `markerScale`).
- Tailwind v4, Klassen ohne eckige Klammern. Icons aus `src/icons/`.

## Offline

**Lesen ja, bauen nein.** Ausdrückliche Entscheidung des Users.

- `GET /api/plays` liefert alle Plays vollständig. Ein einziger Aufruf beim Öffnen
  der Übersicht wärmt damit den Cache für jedes Play — auch für die, die man noch
  nie geöffnet hat. Das ist der Grund für den fetten Listen-Endpunkt.
- Der bestehende `NetworkFirst`-Cache für `/api`-GETs trägt die Antwort. **Zu
  prüfen:** `maxEntries: 100` gilt für alle API-GETs gemeinsam; ein einzelner
  Listeneintrag ist unkritisch, eine eigene Cache-Regel für `/api/plays` ist
  trotzdem die sichere Variante.
- **Der Editor braucht Verbindung.** Kein lokaler Entwurfsspeicher, kein
  Nachsenden.
- Scheitert ein Autosave, zeigt der Kopf statt „Gesichert" ein deutliches **„Nicht
  gesichert"** in `softball-red` mit Wiederholen-Knopf, und das Verlassen der Seite
  warnt. Ein still verlorenes halb gebautes Play wäre genau das Anti-Ziel „Trainer
  baut lieber wieder mit dem Fuß im Sand".

## Start-Plays

Acht Stück, eins je Kategorie, als einmalige Migration. Sie zeigen, wie ein Play
aussieht, und sind zum Abwandeln gedacht:

1. **Cut-off & Relay** — Single ins RF, Runner auf 1, Cut-Mann auf die 3
2. **Bunt-Defense** — Sac-Bunt, Runner auf 1, Wurf auf die 1
3. **Rundown** — Runner zwischen 1 und 2
4. **First-and-Third** — Wurf auf die 2, Runner auf 3 startet
5. **Pop-up-Priorities** — Fly ins kurze rechte Feld, wer fängt
6. **Steal-Defense & Pickoff** — Steal auf die 2, Wurf vom Catcher
7. **Base-Coverage** — Grounder zum SS, wer deckt die 2
8. **Sonstiges** — Standard-Aufstellung als Ausgangspunkt

Jedes mit 3–6 Ständen und Notizen.

**Reihenfolge: Werkzeug zuerst, Plays danach.** Der Umsetzer entwirft die acht
Plays selbst; der Trainer ändert sie danach **in der App** oder baut sie neu — sie
sind normale Plays ohne Sonderstatus, dafür braucht es keine weitere Migration und
keine Freigabeschleife. Dasselbe gilt für die Koordinaten der
**Standard-Aufstellung** (Ein-Tipp-Reset).

Daraus folgt für `V68`: nur einfügen, nie aktualisieren. Wer ein Start-Play
ändert, ändert seine eigene Kopie der Zeile; wer es löscht, ist es los.

---

## Vom Autor entschieden

Nicht vom User bestätigt, sondern von mir festgelegt, weil es ein Entwickler
ohnehin hätte entscheiden müssen:

- **Marker in JSON-Spalte** statt eigener Tabelle.
- **PUT ersetzt vollständig** statt PATCH je Stand.
- **Autosave** statt Speichern-Knopf (sonst passt das Höhenbudget nicht).
- **Ausgangslage ist der erste Stand**, kein eigenes Feld.
- **Zeitleiste als Schieberegler** statt nummerierter Stand-Pillen.
- **Koordinaten in Board-Einheiten mit y nach unten**, Zuschnitt verändert nur die
  Darstellung.
- **`outs` bis 3**, damit ein Play mit dem dritten Out enden darf.
- **Listen-Endpunkt liefert vollständige Plays** — dadurch ist Offline-Lesen ohne
  eigene Mechanik abgedeckt.
- **Gegenstück einseitig**, Auswahl im Setup, beim Löschen auf `NULL`.
- **Füll-Deckel von 20 ft je Seite** beim Beschnitt.
- **Keine Berechtigungen** — wer in der App ist, darf bauen und ändern, wie überall
  sonst im Planner.
- **Gras, Sand und Optic Yellow** als drei neue Theme-Farben.

## Befunde aus dem Prototyp

Ein Wegwerf-Prototyp mit echtem Ziehen und echter Wiedergabe wurde gebaut und im
Browser getestet. Was er gezeigt hat:

**Bestätigt**

- **Anheben über die Fingerkuppe funktioniert.** Im Test lag der Zeiger 28 px
  *unter* der Zielbase, der Runner rastete trotzdem exakt auf `(155; 133,2)` ein.
  Ohne das Anheben verdeckt der Finger genau die Stelle, auf die man zielt.
- **Einrasten mit 12 ft Radius** ist weit genug zum Treffen und eng genug, um
  Zwischenpositionen zuzulassen (Runner zwischen den Bases bei einem Rundown).
- **Greifen über den nächstgelegenen Marker**, nicht über Treffer-Rechtecke:
  gesucht wird der Marker mit dem kleinsten Abstand innerhalb von 22 px. Bei
  überlappenden Markern gewinnt der nähere, statt dass gar nichts passiert.
- **Zwei Kurven sind unterscheidbar.** In der Mitte der Animation lag der Ball
  deutlich weiter als der Runner — `ease-out` gegen `ease-in-out` ist sichtbar,
  nicht nur Theorie.

**Gefunden und zu vermeiden**

- **Die Wiedergabe darf nicht in den Zustand schreiben, aus dem sie liest.** Im
  Prototyp überschrieb das erste Zwischenbild die Stände und die Animation starb
  mit `Cannot read properties of undefined`. Die Interpolation bekommt die Stände
  als Parameter und liefert ein **abgeleitetes Zwischenbild**; der gespeicherte
  Zustand wird währenddessen nicht angefasst.
- **Die Flugbahn fehlte während der Animation.** Sie muss **mitwachsen**: gezeichnet
  wird von der Ausgangsstelle bis zur aktuellen Ballposition, nicht erst am Ende.
  Sonst rutscht eine Kugel ohne Zusammenhang durchs Bild.
- **Beim Greifen springt der Marker um 28 px.** Dieser Sprung gehört animiert
  (150 ms, `--ease-out-strong`), sonst wirkt es wie ein Fehler.
- **Zuschnitt beim Ziehen nicht neu berechnen.** Der Zuschnitt hängt an allen
  Markern; rechnet man ihn während des Ziehens laufend neu, wandert das Bild unter
  dem Finger. Neu berechnet wird erst beim Loslassen.
- **`touch-action: none`** auf der Boardfläche, sonst scrollt oder zoomt das
  Handy beim Ziehen. `overscroll-behavior: none` auf `body` dazu.

## Befunde aus dem Durchklicken

**Werkzeug-Modi fliegen raus.** Im Prototyp gab es „Ziehen · Ball · Runner" als
Modi. Beim Durchklicken passierte beim Tippen auf „Ball" sichtbar nichts — und
genau das ist das Problem mit Modi: unsichtbarer Zustand, der das Verhalten
ändert. Ziehen funktioniert ohnehin immer und für alles. Übrig bleiben echte
**Handlungen** statt Modi:

| Knopf | Was er tut |
|---|---|
| Runner + | setzt einen Runner an Home, von dort zieht man ihn weiter |
| Standard | stellt die neun Verteidiger auf die Normalpositionen |
| ↶ | Rückgängig, fünf Stufen |

Den Ball weist man einem Fielder zu, indem man ihn auf dessen Scheibe zieht — das
Einrasten zeigt es an. Kein Modus nötig.

**Weitere Befunde**

- **Abspielen bei nur einem Stand macht nichts** und sagt auch nichts. Der Knopf
  ist deaktiviert, solange es weniger als zwei Stände gibt.
- **Die Zeitleiste sieht bei einem Stand aus wie ein toter Regler.** Sie erscheint
  erst ab zwei Ständen.
- **Der Dauer-Schalter wechselt beim Standwechsel seinen Wert** — richtig, weil
  er zum Stand gehört, wirkt aber wie ein Zurücksetzen. Er bekommt die Beschriftung
  „Dauer", damit die Zugehörigkeit lesbar ist.
- **„Sichert…" blinkte bei jeder Berührung auf.** Der Status zeigt nur echte
  laufende Anfragen, nicht jeden Fingerkontakt.
- **Rückgängig wird beim Greifen aufgezeichnet**, nicht beim Loslassen — sonst
  fehlt der Stand vor der Bewegung.

## Tests

**Domain, JUnit** — `PlayValidator`: lückenlose `ordinal`, mindestens ein Stand,
`outs` 0–3, erlaubte Dauern, Kategorie existiert, `counterpartPlayId` ≠ eigene id.
Jede Regel ein Testfall mit gültig und ungültig.

**Backend, Testcontainers** — `PUT` ersetzt Stände vollständig (alt weg, neu da,
in einer Transaktion); `GET /api/plays` liefert Stände mit; Kategorie löschen
schlägt fehl, solange Plays daran hängen; Zusammenführen hängt Plays um; Löschen
eines Plays setzt `counterpartPlayId` anderer Plays auf `NULL`.

**Frontend, Vitest** — die Rechenkerne, weil sie sonst niemand prüft:

| Was | Erwartung |
|---|---|
| `computeCrop` | umschließt alle Marker aller Stände, 20 ft Rand, Mindestbreite 130 ft, Home immer enthalten |
| Maßstab mit Deckel | nie mehr als 20 ft je Seite beschnitten, Home bleibt unten |
| `markerRadius` | Durchmesser = 30 % des Base-Wegs, zwischen 26 und 44 px |
| `frameAt` | verändert die Eingabe-Stände nicht; bei `t=0` und `t=1` exakt Stand A bzw. B |
| Kurven | Ball ist zur Hälfte der Zeit weiter als ein Spieler mit gleicher Strecke |
| Runner-Pfad | von 1 nach 3 führt über 2, nicht quer übers Infield |

**E2E, Playwright** — neue Datei `frontend/e2e/playmaker.spec.ts`, nicht in die
Scoring-Suite einhängen:

1. Play anlegen, Runner per Base-Tipp setzen, Editor öffnet mit einem Stand.
2. Marker ziehen, loslassen, Position gespeichert.
3. Runner nahe einer Base loslassen → rastet exakt auf die Base ein.
4. „+ Stand" erzeugt eine Kopie; Änderung darin lässt Stand 1 unberührt.
5. Rückgängig stellt die letzte Bewegung wieder her, fünf Stufen tief.
6. Abspielen läuft durch und endet auf dem letzten Stand; die Stände sind danach
   unverändert (der Fehler aus dem Prototyp).
7. Kein vertikales Scrollen bei 320×568 und 390×844 — `scrollHeight` gleich
   `innerHeight`.
8. Stand löschen fragt nach und nummeriert neu.

**Von Hand, weil Maschinen das nicht beurteilen** — Prüfliste für den Trainer:

- Draußen bei Sonne: findet man Ball und Runner ohne Suchen?
- Mit kalten oder nassen Fingern: trifft man die Marker?
- Ein ganzes Play in unter fünf Minuten gebaut — oder greift man doch zum Fuß im Sand?
- Läuft die Animation zu schnell, zu langsam, oder stimmt das Tempo?
- Einem Spieler ohne Erklärung hinhalten: versteht er, was passiert?
- Am Zaun mit Handschuh in der anderen Hand: erreicht der Daumen alles?

## Play-Katalog

Der vollständige Satz zum Mitliefern. Alle sind normale Plays — löschen, ändern und
neu bauen steht frei. Jede Feldposition kommt mindestens einmal als Hauptfigur vor.

### Base-Coverage (9)

| Play | Im Mittelpunkt |
|---|---|
| Grounder zum SS — wer deckt die 2 | SS, 2B |
| Grounder zum 2B — wer deckt die 2 | 2B, SS |
| Grounder zum 3B — Wurf auf die 1 | 3B, 1B |
| Grounder zum 1B — wer deckt die 1 | 1B, P |
| Comebacker zum Pitcher | P |
| Grounder zum SS mit Runner auf 1 — Doppelspiel 6-4-3 | SS, 2B, 1B |
| Single ins LF — Backup hinter der 2 | LF, CF, P |
| Single ins RF — Backup hinter der 1 | RF, 1B, P |
| Überwurf an der 1 — wer sichert ab | 1B, RF, P |

### Cut-off & Relay (8)

| Play | Im Mittelpunkt |
|---|---|
| Single ins LF, Runner auf 1 — Wurf auf die 3 | LF, SS |
| Single ins CF, Runner auf 1 — Wurf auf die 3 | CF, SS |
| Single ins RF, Runner auf 1 — Wurf auf die 3 | RF, SS |
| Single ins LF, Runner auf 2 — Wurf nach Home | LF, 3B |
| Single ins RF, Runner auf 2 — Wurf nach Home | RF, 1B |
| Double in die linke Gasse — Relay über SS | SS, LF, CF |
| Double in die rechte Gasse — Relay über 2B | 2B, RF, CF |
| Tiefes RF, Doppel-Relay — zwei Spieler in der Kette | RF, 2B, 1B |

### Bunt-Defense (6)

| Play | Im Mittelpunkt |
|---|---|
| Sac-Bunt, Runner auf 1 — sicherer Out an der 1 | P, 1B, 3B |
| Sac-Bunt, Runner auf 1 — Wurf auf die 2 | C, SS |
| Bunt Richtung 3B, Runner auf 2 — SS deckt die 3 | 3B, SS |
| Runner auf 1 und 2 — Wheel Play | 3B, SS, P |
| Squeeze, Runner auf 3 | C, P |
| Bunt direkt vor Home — Catcher übernimmt | C |

### First-and-Third (4)

| Play | Im Mittelpunkt |
|---|---|
| Wurf auf die 2, Runner auf 3 startet — zurück nach Home | C, SS, P |
| Catcher wirft an den Pitcher — Abfangen in der Mitte | C, P |
| Angetäuschter Wurf auf die 2 | C, 2B |
| Direkter Wurf auf die 3 | C, 3B |

### Rundown (4)

| Play | Im Mittelpunkt |
|---|---|
| Zwischen Home und 1 | C, 1B, P |
| Zwischen 1 und 2 | 1B, 2B, SS |
| Zwischen 2 und 3 | SS, 3B, 2B |
| Zwischen 3 und Home | 3B, C, P |

### Pop-up-Priorities (5)

| Play | Im Mittelpunkt |
|---|---|
| Pop-up hinter der 1 — wer ruft | 1B, 2B, RF |
| Pop-up hinter der 3 — wer ruft | 3B, SS, LF |
| Pop-up hinterm Infield, Mitte | SS, 2B, CF |
| Foul-Pop hinter Home | C, 1B, 3B |
| Infield Fly — Lage und Verhalten | SS, P |

### Steal-Defense & Pickoff (7)

| Play | Im Mittelpunkt |
|---|---|
| Steal auf die 2 — Wurf und Abdeckung | C, SS, 2B |
| Steal auf die 3 — Wurf und Abdeckung | C, SS, 3B |
| Doppel-Steal, Runner auf 1 und 2 | C, SS, 3B |
| Pickoff an der 1 | C, 1B |
| Pickoff an der 2 | C, SS, 2B |
| Pickoff an der 3 | C, 3B |
| Delayed Steal — verzögerter Start | C, 2B, SS |

### Spielsituationen (5)

| Play | Im Mittelpunkt |
|---|---|
| Standard-Aufstellung | alle neun |
| Infield In, Runner auf 3, knapp am Ende | alle Infielder |
| Outfield tief, Vorsprung halten | LF, CF, RF |
| Ball am Zaun — Relay-Kette | CF, SS, 2B |
| Passed Ball, Runner auf 3 — Abdeckung an Home | C, P |

**Summe: 48 Plays.** Die mit „knapp am Ende" markierten tragen die Spiellage
`CLOSE_LATE`; wo es ein sinnvolles Gegenstück gibt (etwa „Wurf nach Home" gegen
„Cut schneidet ab, Out an der 2"), wird es über `counterpartPlayId` verknüpft.

## Offen gelassen für den Umsetzer

- Wie die Interpolation entlang der Base-Wege konkret implementiert wird
  (Polyline-Abschnitte vs. parametrische Kurve).
- Ob der Editor seinen Zustand bei Verlassen der Seite zwischenspeichert.
- Genaues Layout des Querformats jenseits von „Leisten nach rechts".
- Form des durchgestrichenen Out-Markers.
