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

1. Typst-Datei in `drills/drills/` bearbeiten (neuen `#drill(...)` Block einfügen)
2. `./drills/build.sh` ausführen — das Script erledigt alles automatisch:
   - Kompiliert Typst → PDF
   - Kopiert PDF nach `backend/src/main/resources/static/`
   - **Synchronisiert `pdfPage`-Nummern** in `drills.json` automatisch (per `typst query`)
   - Warnt wenn Drills in JSON keinen Match in der PDF haben
   - Warnt wenn neue Drills in der PDF noch nicht in `drills.json` stehen
3. `backend/src/main/resources/drills.json` updaten:
   - Neuen Drill eintragen (id, name, categories, minPlayers, equipment, description, rotation, ...)
   - **pdfPage wird automatisch gesetzt** — nicht manuell pflegen!
   - Danach nochmal `./build.sh` laufen lassen um die pdfPage für den neuen Eintrag zu setzen
4. Falls neue Kategorie: `DrillCategory.java` Enum + `FOCUS_CATEGORY_MAP` in Generator + Frontend erweitern

## Aktueller Stand

- **41 Drills** in drills.json
- **33 Seiten** PDF
- Letzte Änderung: 15.04.2026 (Whiffleballs bei Hitting, neue Drills: Hocke-Wurf, Grounder-Fielding, Outfield Basic, Relay Einfach, Infield→Home, Infield Plays)
