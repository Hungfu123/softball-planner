# Playmaker

Ein Feld zum Zeigen. Der Trainer stellt Positionen, Runner und den Ball hin, baut daraus
eine Folge von **Ständen** und spielt sie ab — am Tablet im Dugout, am Handy auf dem Platz,
auch ohne Netz.

Liegt unter **Orga → Playmaker** (`/orga/playmaker`). Übersicht, Setup und Spieleransicht
sind drei Seiten; Editor und Spieleransicht laufen **außerhalb** von `Layout`, wie
`ScoringPage`, weil sie die ganze Höhe brauchen (`h-dvh`, kein vertikales Scrollen).

## Datenmodell

```
play              id, title, category_id, game_state, game_state_note, counterpart_play_id
play_step         play_id, ordinal (1..N), duration_ms, note, outs, markers (jsonb)
play_category     id, name            (V66/V67, Start-Plays in V68)
```

`markers` ist ein JSON-Dokument je Stand:

```jsonc
{
  "defenders": [{ "position": "SS", "x": 133, "y": 140 }, …],   // immer alle neun
  "runners":   [{ "id": "r1", "x": 197.43, "y": 175.57, "status": "ACTIVE" }],
  "ball":      { "state": "IN_HAND", "holder": "P", "x": 155, "y": 182, "trajectory": "AIR" }
}
```

- **Koordinaten sind Fuß**, Ursprung oben links, **y nach unten**, Home bei (155, 218).
  Dieselben Landmarken stehen in `frontend/src/components/playmaker/board/geometry.ts`
  und in `scripts/build-seed-plays.mjs` — wer eine ändert, ändert beide.
- **Fastpitch-Maße:** Base-Weg 60 ft, Pitching 43 ft, Circle 8 ft Radius, Sandbogen 60 ft
  um die Platte, Zaun 215 ft, Backstop 25 ft.
- **Grammatik:** seit dem 31.10.2026 spielt das Board auf derselben Bühne wie das
  Spielwissen (`board/farben.ts`): der Platz ist **navy**, Menschen, Linien und Ball sind
  **cream**, **amber** ist, worauf man achtet, **rot** heißt Out. Verteidiger sind helle
  Scheiben mit dunklem Kürzel, Runner amber und kleiner (0,82) — ein ausgemachter Runner
  wird rot mit hellem Ring. Der Ball ist ein kleiner cremefarbener Punkt mit rotem
  Nahtring, wie auf den Karten. Vorher war der Platz grün mit Sand und weißen Linien, die
  Runner rot, der Ball Optic Yellow; nebeneinander sahen die beiden Hälften der App aus
  wie zwei Programme. **Die Ringe sind gemessen, nicht geschmückt:** rot misst auf navy
  2,68:1 und braucht den hellen Ring, amber auf cream 1,55:1 — deshalb trägt jeder Runner
  einen dunklen Ring, damit er beim Tag nicht mit dem Verteidiger verschmilzt.
- **Der Katalog hat einen Pruefer** (`node scripts/pruefe-plays.mjs`): neun Verteidiger je
  Stand, ein Wurf auf eine Base hat einen Empfaenger, Outs steigen und zaehlen, niemand
  springt, kein Stand ohne Bewegung und ohne Satz, Home steht nicht offen, wenn ein Runner
  darauf zulaeuft, und der Pitcher steht nicht herum, waehrend der Ball im Outfield ist.
  **Wer den Katalog aendert, laesst ihn laufen.** Er ist misstrauisch getestet: schickt man
  alle 1B vom Platz, meldet er elf fehlende Empfaenger.
- **Absicherung ist eine Regel, kein Katalogeintrag** (`absichern()` in
  `scripts/build-seed-plays.mjs`): **RF hinter die 1, CF hinter die 2, LF hinter die 3,
  der Pitcher hinter die Platte — und beim Relay aus dem Outfield geht der Pitcher hinter
  die Zielbase**, weil die Outfielder dann selbst am Ball sind. Gezählt vor der Regel:
  von 48 Würfen auf eine Base standen bei **8** jemand dahinter, nachher bei **47**. Der
  Katalog behält das letzte Wort — bewegt er den Mann im selben Stand selbst, oder steht
  dort schon jemand, bleibt es dabei. Angewandt wird sie in `V75__plays_absicherung.sql`.
- **`status`** am Runner: `ACTIVE`, `OUT` (durchgestrichen, im Folgestand weg), `SCORED`
  (gar nicht mehr gezeichnet). Ein Out und ein Run dürfen nicht gleich aussehen.
- **`trajectory`** gilt für den Weg, der IN diesen Stand führt: `AIR` zeichnet einen Bogen,
  `GROUND` eine gerade Linie. Im Editor über Antippen des Balls.

## Trefferflächen: 44 px, auch in der Kopfzeile

Gemessen über fünf Seiten × sieben Geräteformate (Handy hoch/quer, SE hoch/quer, Tablet
hoch/quer, Desktop): kein Scrollen auf den `h-dvh`-Seiten, nichts aus dem Bild geschoben,
Board-Seitenverhältnis überall zwischen 0,45 und 2,2. Die Trefferflächen waren es nicht —
„Zurück" und „Ändern" maßen **31 × 16 px**, die Outs-Punkte **10 × 10**, das Fragezeichen
28 × 28. Jetzt ist die Fläche überall ≥ 44 px hoch, während die Schrift und die Punkte
klein bleiben: der Knopf wächst, nicht sein Aussehen.

Offen und **nicht** vom Playmaker zu entscheiden: der gemeinsame `Button` ist 36 px hoch
(„Neues Play", „Play bauen"). Das betrifft die ganze App.

### Finger prüft man nur mit echtem Touch

`page.mouse` bleibt auch in einem `hasTouch`-Kontext eine Maus, und `page.touchscreen` kann
nur tippen. Selbstgebaute Pointer-Ereignisse scheitern an `setPointerCapture`, weil die
erfundene Zeiger-Nummer nicht existiert — das sah einmal aus wie „Ziehen am Handy kaputt"
und war das Messwerkzeug. Echte Finger gibt es nur über CDP (`Input.dispatchTouchEvent`);
`e2e/playmaker/finger.spec.ts` macht das, hochkant und quer. Gegenprobe: mit abgeschalteten
Touch-Gesten fallen alle vier um.

`setPointerCapture` steht deshalb in einem `try/catch`: wirft es, startete der Zug sonst
gar nicht erst.

## Die Kopfzeile braucht eine definierte Spalte

Editor und Spieleransicht setzen `grid-cols-1` im Hochformat. Ohne das hat das Raster
keine definierte Spalte, sie wächst auf die breiteste Inhaltsbreite — der lange Titel in
der Kopfzeile zog sie auf 596 px bei 390 px Bildschirm und schob „Legende", „Ändern" und
die Outs hinaus, wo `overflow-hidden` sie abschnitt. Sie waren da, nur nicht zu sehen.
`truncate` am Titel half nicht: es begrenzt den Text, nicht die Spalte.

## Querformat

Editor und Spieleransicht schalten bei `landscape` auf dasselbe zweispaltige Raster wie ab
`lg` — Leisten nach rechts, Feld über die ganze Höhe. Ohne das blieben am quer gehaltenen
Handy (844 × 390) **127 px** fürs Feld: ein Band, in dem die Raute verschwindet. Die
Standliste braucht dabei `overflow-y-auto` am Rahmen, nicht nur an der `<ol>` — in einer
Grid-Zeile `minmax(0,1fr)` hat ein bloßes `block`-Element keine gebundene Höhe und die
Liste lief über die Werkzeugleiste.

## Freies Feld

`/orga/playmaker/frei` — ein Board zum Draufzeigen, **kein Play**. Für die Pause: aufmachen,
schieben, reden. Es entsteht nichts im Katalog — kein Titel, keine Kategorie, keine Stände.

- **Ausgangslage:** neun Verteidiger in Standardaufstellung, **Ball an Home** (nicht beim
  Pitcher wie in einem Play — das freie Feld fängt beim Schlag an), keine Runner.
- **Runner:** Base in der Leiste antippen setzt oder nimmt; der Marker selbst antippen
  nimmt ihn weg. Keine Outs, keine Runs — dafür gibt es Plays.
- **Ballbahn:** die gestrichelte Linie läuft von dort, wo der Ball lag, **als die Geste
  anfing**, bis dorthin, wo er jetzt liegt. Der Wurf davor bleibt blass stehen, damit eine
  Kette aus zwei Würfen lesbar ist.
- **Der Stand bleibt**, im Gerät (`localStorage`, Schlüssel `playmaker-freies-feld`).
  „Nicht gespeichert" heißt **nicht im Katalog**, nicht *weg beim Zumachen*.
  Zurücksetzen fragt nach und ist per Rückgängig umkehrbar.
- **Marker werden ins Feld geklemmt.** Ohne das ließ sich der Ball hinter den Zaun ziehen
  und war danach nicht mehr greifbar. Im Editor fällt das nicht auf, weil der Zuschnitt
  dort dem Inhalt folgt und mitwächst.
- **Zuschnitt nach Inhalt**, nicht ganzes Feld: das ganze Feld ist breiter als hoch, auf
  einem hochkant gehaltenen Handy bliebe darüber fast die Hälfte leeres Gras.
- **Kein `/api`.** Die Seite ruft nichts ab und sendet nichts — auch beim ersten Aufmachen
  nicht. Ein E2E-Test blockiert alle Pfade unter `/api/` und prüft, dass trotzdem alles
  geht. (Das Muster muss `url.pathname` prüfen; `**/api/**` trifft im Dev-Server auch
  `/src/api/client.ts`, dann startet die App gar nicht und der Test prüft sich selbst.)

Die Zieh-Logik teilt es sich mit dem Editor (`useBoardGesten`): Griff über der Fingerkuppe,
eingefrorener Zuschnitt, Trefferfläche des gehaltenen Balls, zweiter Finger, abgebrochene
Geste. Diese Feinheiten will man nicht zweimal pflegen.

**React-Updater müssen rein bleiben.** Die Ballbahn war zuerst unsichtbar, weil ein `ref`
INNERHALB der State-Updater-Funktion gesetzt wurde: React ruft die im Entwicklungsmodus
doppelt auf, der erste Durchlauf setzte das Flag, der zweite übersprang deshalb die
Zuweisung — und der zweite ist der, dessen Ergebnis React behält. Die Tests rendern den
Hook deshalb in `StrictMode`, sonst fällt so etwas nicht auf.

## Wiedergabe

`usePlayback` interpoliert zwischen zwei Ständen (`board/interpolate.ts`) und fasst die
gespeicherten Stände dabei **nie** an — es gibt ein abgeleitetes Zwischenbild zurück.

- Verteidiger und Runner laufen mit ease-in-out, der Ball mit ease-out: er ist zur Halbzeit
  sichtbar weiter, und genau das macht Gleichzeitigkeit lesbar.
- Dauer steht **je Stand** (`duration_ms`), danach 400 ms Halt. Tempo 0,5× / 1× / 2×.
- **Die Spur wächst mit.** Ball- und Laufweg werden aus dem LAUFENDEN Übergang gezeichnet
  (`spur: {von, nach, t}`), nicht aus `previous`. Während der Bewegung von Stand N nach N+1
  steht `index` noch auf N und `previous` war N−1 — man sah die alte Linie, und die richtige
  erschien erst beim Umspringen; beim ersten Übergang gab es gar keine. Der Teilweg wird mit
  de Casteljau exakt aus derselben Kurve geschnitten, auf der der Ball fliegt, damit die Form
  beim Wachsen stehen bleibt.
- **Der Ball fliegt auf seiner Bahn**, nicht daneben. Vorher lief er auf der geraden
  Verbindung, während der Bogen danebenlag.
- **Die Zeitleiste bekommt den Bruchteil** (`fortschritt`), sonst steht ihr Knopf zwei
  Sekunden still und springt dann.
- Der Platz (Gras, Sand, Linien, Bases) ist eine gemerkte Komponente: er ändert sich nie,
  React rechnete ihn aber in jedem Bild nach.
- **Ein Tipp aufs Feld schaltet um**, er pausiert nicht nur. Das Feld füllt am Handy den
  halben Bildschirm; ein Streiftipp hielt die Wiedergabe lautlos an, und der nächste Druck
  auf den Knopf startete sie wieder — er stand ja inzwischen auf ▶.
- **Runner folgen den Base-Wegen**, nicht der Luftlinie. Die Raute ist dafür ein **Ring**:
  Home liegt bei 0, die 1 bei 60, die 2 bei 120, die 3 bei 180 Fuß. Jeder Punkt innerhalb
  von 6 ft an einem Base-Weg bekommt so eine einzige Zahl, und zwischen zwei Zahlen läuft
  man den Ring entlang. Das ist nötig, weil in den Plays fast nie exakt auf einer Base
  gestanden wird: 210 von 210 Runner-Bewegungen der Start-Plays liegen auf dem Weg, 49
  davon führen über eine Base hinweg. Eine Routenwahl, die nur exakte Bases kennt, schnitt
  die genau dort ab.
  Rückwärts läuft nur, wer zurück muss (Rundown) — **nie rückwärts nach Home**, das wäre ein
  Run auf dem Rückweg. Home muss dafür auf 0 abgebildet werden und nicht auf 240, sonst
  greift die Regel nicht. Wer gar nicht auf dem Ring steht, läuft geradeaus.
- **Der Runner bekommt keine Linie.** Er bewegt sich sichtbar; eine zweite Spur neben der
  Ballbahn machte das Bild voll, ohne etwas zu sagen, was die Bewegung nicht schon zeigt.
- `prefers-reduced-motion`: es wird gesprungen statt interpoliert, der Halt bleibt.

## Dauer

`PlayValidator` lässt **200–6000 ms in Schritten von 200** zu. Die Oberfläche bietet davon
drei an (600 / 1200 / 2000), die Start-Plays rechnen ihre Dauer aus der längsten Strecke des
Standes (~24 ft/s). 78 ft in 2 Sekunden sehen nicht nach Laufen aus, sondern nach einem
Sprung — deshalb ein Bereich und keine Liste.

## Migrationen der Start-Plays sind unveränderlich

**V68 ist in Produktion angewandt. Wer sie nachträglich ändert, erzeugt eine
Flyway-Prüfsummen-Kollision — die Migration bricht ab und das Backend startet nicht mehr.**
Korrekturen am Katalog kommen deshalb als neue Migration. Den Unterschied dafür liefert der
Generator selbst:

```bash
node scripts/build-seed-plays.mjs --seit backend/src/main/resources/db/migration/V68__seed_plays.sql   > backend/src/main/resources/db/migration/V70__....sql
```

Das vergleicht den Katalog mit einer schon angewandten Migration und gibt `UPDATE`-Anweisungen
für genau die Stände aus, die sich geändert haben — verglichen wird der ganze Stand, weil eine
verschobene Scheibe im `markers`-JSON steckt. V69 ist auf diesem Weg entstanden (Cut-off).

## Start-Plays

51 Stück, 8 Kategorien, erzeugt aus `scripts/build-seed-plays.mjs`:

```bash
node scripts/build-seed-plays.mjs > backend/src/main/resources/db/migration/V68__seed_plays.sql
```

Der Katalog beschreibt je Stand nur, **was sich ändert**; alles andere bleibt stehen. Der
Generator leitet daraus ab:

- **Kontakt** — verlässt der Ball die Hand des Pitchers, ohne dass ihn jemand fängt, wurde
  geschlagen: die Flugbahn beginnt an Home, und der Batter-Runner erscheint **an der
  Platte**, nicht auf halber Strecke. `keinSchlag: true` schaltet das ab — ein Passed Ball,
  ein Pickoff und jeder Wurf des Catchers sind kein Schlag und haben keinen Batter.
- **Der Batter läuft** automatisch weiter, bis ein Stand ihn selbst setzt. Ein Ende
  (`rb: 'OUT'`, `rb: null`, `{ p: B1, status: 'OUT' }`) beendet ihn; eine Stelle abseits des
  Wegs zur 1 auch — sonst zöge der Automat einen Runner von der 2 zurück auf die 1.
- **Dauer** aus der längsten Strecke, Untergrenze 1200 ms, `ms:` überschreibt.
- **Ein ankommender Ball** rückt 7 ft vor seinen Fänger: genau auf ihm verdeckt er dessen
  Kürzel, und „RF nimmt auf" ist dann nicht mehr zu lesen.

Zwei Prüfskripte liegen im Scratchpad-Muster und lohnen sich bei jeder Katalogänderung:
Laufwege/Tempo/Out-Buchführung gegen `/api/plays`, und Marker, die sich überdecken.
`SeedPlaysTest` prüft jedes Start-Play gegen `PlayValidator`.

## Übersicht

Hero (das zuletzt bearbeitete Play, groß als Feld), darunter Kategorie-Auswahl, Suche und
die Liste. Drei Dinge, die nicht beliebig sind:

- **Die Suche läuft im Browser**, nicht im Backend — entgegen der Hausregel und mit
  Absicht: die Übersicht lädt ohnehin alle Plays samt Ständen (daran hängt das
  Offline-Versprechen), ein Suchendpunkt wäre am Platz ohne Netz tot. Gesucht wird in
  Titel, Kategoriename, Begründung der Spiellage und **jeder** Notiz; die Zeile sagt
  dazu, wo der Treffer sitzt. Umlaute zählen in beide Richtungen („ueberwurf" findet
  „Überwurf").
- **Der beste Treffer übernimmt das Hero-Feld**, statt dass es verschwindet. Das Hero ist
  256 px hoch und steht ÜBER dem Suchfeld: ließ man es beim ersten Buchstaben weg, sprang
  das Eingabefeld um genau diese 256 px nach oben — am Handy genau dann, wenn die Tastatur
  hochkommt. Dieselbe Fläche trägt deshalb auch die Auskunft „nichts gefunden".
- **Die ungefilterte Liste ist nach Kategorie gegliedert**, mit klebenden Überschriften,
  und das Suchfeld klebt mit. 51 Plays sind rund 4000 px; vom letzten Block waren es sonst
  3400 px zurück nach oben, nur um etwas einzutippen.

- **Die Blöcke klappen zu**, je Gerät in `localStorage` gemerkt (`playmaker-zugeklappt`) —
  am Tablet im Dugout will man andere offen haben als am Rechner. Sind alle zu, ist die
  Seite ein Inhaltsverzeichnis: dann weicht das Hero-Feld einer schmalen Zeile, und alles
  passt ohne Scrollen auf ein Telefon ab ~810 px Höhe (iPhone X aufwärts). Auf dem SE
  (667 px) passt es nicht — dafür müssten die Überschriften unter 44 px Trefferfläche
  fallen, und das ist es nicht wert.
  Ein flachgedrücktes Feld statt der Zeile wäre nutzlos: das Board zieht den Ausschnitt auf
  das Seitenverhältnis der Fläche, bei 112 px Höhe liegt die Raute als Streifen in der
  Mitte.

Kopieren meldet sich mit einem Toast (das Ergebnis steht ganz oben und damit außer Sicht),
Löschen fragt per Modal — es ist nicht rückgängig zu machen. Beides gibt es auch am Hero.

## Play ändern

Titel, Kategorie, Spiellage und Gegenstück ändert man im Editor über den **Titel in der
Kopfzeile** (`PlayDetailsSheet`) — dieselben Felder wie beim Anlegen, in derselben
Reihenfolge. Vorher ging das gar nicht: der Editor schickte diese Felder beim Sichern
unverändert mit, änderbar waren sie nur im Anlege-Dialog. Die Stammdaten liegen deshalb im
Zustand des Editors und nicht am Prop — sonst überschreibt der nächste Zug eine gerade
geänderte Kategorie wieder mit der alten.

Der zugängliche Name des Knopfs enthält den Titel (`"<Titel> ändern"`), nicht nur die
Handlung: sonst heißt die Überschrift der Seite für einen Screenreader „Play ändern" und das
Play selbst kommt nicht mehr vor.

## Cut-off und Relay: die Konvention der Dead Sox

Es gibt kein allgemeingültiges System — die Softball-Literatur kennt mindestens zwei, und
welches gilt, hängt an Alignment und Altersklasse. Für die Dead Sox gilt:

- **Der Cut-Mann ist immer ein Mittelinfielder**, nie ein Corner. Welcher, entscheidet die
  Seite, auf der der Ball liegt: **links und Mitte → SS, rechts → 2B**. Der andere
  Mittelinfielder deckt dafür die 2.
- **Der Mann an der Zielbase stellt ihn.** Wurf nach Home: der **Catcher** — er sieht das
  ganze Feld. Wurf auf die 3: der **3B** an der Base.
- **Die Corner bleiben an ihren Bases.** Der 1B hält die 1, der 3B die 3.
- Der **Pitcher** sichert ab: hinter der 3 oder hinter der Platte, nie an der 1 (das macht
  der Catcher) und nie an der 2.
- **Der Cut-Mann steht auch beim kurzen Single.** Auf 120 ft könnte der Outfielder direkt
  auf die 3 werfen — der Cut geht trotzdem raus. Er ist die Absicherung gegen den schlechten
  Wurf, nicht bloß eine Abkürzung für die Distanz. Also nicht „wegoptimieren", nur weil der
  Ball kurz liegt (ausdrückliche Entscheidung des Users).

Die Start-Plays hatten zuerst die Baseball-Variante (1B als Cut für Home aus Center/Rechts,
3B aus Links). Bei 60-ft-Bases und 215-ft-Zaun trägt die nicht: sobald der Ball weiter liegt,
als ein Outfielder direkt nach Home werfen kann, übernimmt der Mittelinfielder — und das ist
hier fast jeder Ball, der hinten ankommt.

## Was der Playmaker NICHT tut

Er rechnet keine Softball-Regeln nach. Zwei Runner auf einer Base, ein Out ohne Ball in der
Nähe, vier Outs im Inning — der Trainer darf das hinstellen, das Board zeichnet stumm, was
dasteht. Geprüft wird nur, was zu kaputten Daten oder einer unbrauchbaren Darstellung führt:
Titel, lückenlose Nummerierung, Outs 0–3, Dauer im Raster, Marker vorhanden.

Offen (bewusst): Live-Vorführen für mehrere Geräte, Suche/Sortierung, PDF.
