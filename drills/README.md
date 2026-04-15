# Dead Sox — Drill-Handbuch (Typst)

## Wichtig: Nur hier bearbeiten!

Die Typst-Quellen für das Drill-Handbuch liegen **in diesem Ordner** (`softball-lineup/drills/`).

Das alte separate Projekt (`/home/hungl/privat/softball-drills/`) ist **veraltet und wird nicht mehr genutzt**. Alle Änderungen nur noch hier machen.

## Struktur

```
drills/
├── drills.typ          ← Hauptdatei (kompilieren mit `typst compile drills.typ`)
├── template.typ         ← Layout-Template + #drill() Funktion
├── diagrams.typ         ← Diagramm-Helfer
├── drills/              ← 13 Drill-Dateien nach Kategorie
│   ├── warmup.typ
│   ├── throwing.typ     ← inkl. Hocke-Wurf, Grounder-Fielding
│   ├── baserunning.typ
│   ├── conditioning.typ
│   ├── pitcher.typ      ← leer (Platzhalter)
│   ├── catcher.typ
│   ├── first-base.typ
│   ├── second-base.typ
│   ├── shortstop.typ
│   ├── third-base.typ
│   ├── outfield.typ     ← inkl. Outfield Basic
│   ├── situational.typ  ← inkl. Relay Einfach, Infield Plays, Infield→Home
│   └── hitting.typ      ← Hitting Stationen + Loading vom Tee
├── build.sh             ← Kompiliert PDF + kopiert in App
├── drills.pdf           ← Generierte PDF (nicht manuell editieren)
├── logo.jpeg
└── file.jpeg
```

## Workflow: Drill hinzufügen/ändern

1. Typst-Datei in `drills/drills/` bearbeiten
2. `./drills/build.sh` ausführen (kompiliert PDF + kopiert nach `backend/src/main/resources/static/`)
3. `backend/src/main/resources/drills.json` updaten:
   - Neuen Drill eintragen (id, name, categories, minPlayers, equipment, description, pdfPage, ...)
   - pdfPage aus dem neuen Inhaltsverzeichnis ablesen (Seite 2-3 der PDF)
   - Bei verschobenen Seiten: pdfPage aller betroffenen Drills aktualisieren

## Aktueller Stand

- **41 Drills** in drills.json
- **33 Seiten** PDF
- Letzte Änderung: 15.04.2026 (Whiffleballs bei Hitting, neue Drills: Hocke-Wurf, Grounder-Fielding, Outfield Basic, Relay Einfach, Infield→Home, Infield Plays)
