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
- **Grammatik:** Verteidiger und Runner sind beide Scheiben; drei Dinge unterscheiden sie
  gleichzeitig — Farbe (navy / rot), Größe (der Runner misst 0,82) und das Kürzel, das nur
  der Verteidiger trägt. Der Ball ist ein deutlich kleinerer Punkt (Optic Yellow, flach,
  ohne Kontur und ohne Schatten). Der Runner war bis Oktober 2026 eine Raute — sie wirkte
  neben neun Kreisen wie ein Fremdkörper und saß auf den Bases sichtbar schief.
- **`status`** am Runner: `ACTIVE`, `OUT` (durchgestrichen, im Folgestand weg), `SCORED`
  (gar nicht mehr gezeichnet). Ein Out und ein Run dürfen nicht gleich aussehen.
- **`trajectory`** gilt für den Weg, der IN diesen Stand führt: `AIR` zeichnet einen Bogen,
  `GROUND` eine gerade Linie. Im Editor über Antippen des Balls.

## Wiedergabe

`usePlayback` interpoliert zwischen zwei Ständen (`board/interpolate.ts`) und fasst die
gespeicherten Stände dabei **nie** an — es gibt ein abgeleitetes Zwischenbild zurück.

- Verteidiger und Runner laufen mit ease-in-out, der Ball mit ease-out: er ist zur Halbzeit
  sichtbar weiter, und genau das macht Gleichzeitigkeit lesbar.
- Dauer steht **je Stand** (`duration_ms`), danach 400 ms Halt. Tempo 0,5× / 1× / 2×.
- **Runner folgen den Base-Wegen**, nicht der Luftlinie: von der 1 nach Home geht es über
  die 2 und die 3. Rückwärts läuft nur, wer zurück muss (Rundown) — **nie rückwärts nach
  Home**, das wäre ein Run auf dem Rückweg. Liegt das Ziel mitten auf einem Base-Weg, führt
  der Weg trotzdem über die Base davor.
- `prefers-reduced-motion`: es wird gesprungen statt interpoliert, der Halt bleibt.

## Dauer

`PlayValidator` lässt **200–6000 ms in Schritten von 200** zu. Die Oberfläche bietet davon
drei an (600 / 1200 / 2000), die Start-Plays rechnen ihre Dauer aus der längsten Strecke des
Standes (~24 ft/s). 78 ft in 2 Sekunden sehen nicht nach Laufen aus, sondern nach einem
Sprung — deshalb ein Bereich und keine Liste.

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

Kopieren meldet sich mit einem Toast (das Ergebnis steht ganz oben und damit außer Sicht),
Löschen fragt per Modal — es ist nicht rückgängig zu machen. Beides gibt es auch am Hero.

## Was der Playmaker NICHT tut

Er rechnet keine Softball-Regeln nach. Zwei Runner auf einer Base, ein Out ohne Ball in der
Nähe, vier Outs im Inning — der Trainer darf das hinstellen, das Board zeichnet stumm, was
dasteht. Geprüft wird nur, was zu kaputten Daten oder einer unbrauchbaren Darstellung führt:
Titel, lückenlose Nummerierung, Outs 0–3, Dauer im Raster, Marker vorhanden.

Offen (bewusst): Live-Vorführen für mehrere Geräte, Suche/Sortierung, PDF.
