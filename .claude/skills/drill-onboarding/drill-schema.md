# Drill-Schema

Drill-Datenmodell aus `backend/src/main/java/com/softball/domain/model/Drill.java`. Quelle der Wahrheit für `drills.json`-Einträge.

## Felder

| Feld | Typ | Pflicht | Default | Beschreibung |
|---|---|---|---|---|
| `id` | String | ja | — | Slug, kebab-case, ASCII, unique |
| `name` | String | ja | — | Anzeigename, Deutsch, Umlaute erlaubt |
| `categories` | List<DrillCategory> | ja | — | Eine oder mehrere, siehe Enum |
| `minPlayers` | int | ja | — | Minimum Spieler |
| `equipment` | List<String> | ja | — | freitext, kann leer `[]` sein |
| `description` | String | ja | — | Mehrzeilig, "\n\n" trennt Phasen, "—" in Headings |
| `hasImage` | boolean | ja | `false` | true wenn Bild im PDF-Handbuch existiert |
| `pdfPage` | Integer | nein | `null` | Seitenzahl im Handbuch (nur wenn dort vorhanden) |
| `rotation` | String | ja | — | Wie/ob Spieler rotieren |
| `variants` | String | nein | `null` | Optional. Varianten als Fließtext |
| `complexity` | DrillComplexity | ja | `"BASIC"` | `"BASIC"` oder `"ADVANCED"` |

## DrillCategory-Enum

Aus `domain/model/DrillCategory.java`:

| Enum-Wert | Deutsch | Phase |
|---|---|---|
| `WARMUP` | Aufwärmen | Aufwärmen |
| `CONDITIONING` | Kondition | Aufwärmen |
| `THROWING` | Werfen | Grundlagen oder Stationen |
| `BASERUNNING` | Baserunning | Grundlagen |
| `CATCHER` | Catcher | Stationen |
| `FIRST_BASE` | First Base (1B) | Stationen |
| `SECOND_BASE` | Second Base (2B) | Stationen |
| `SS` | Shortstop | Stationen |
| `THIRD_BASE` | Third Base (3B) | Stationen |
| `OUTFIELD` | Outfield | Stationen |
| `SITUATIONAL` | Spielsituation | Stationen |
| `HITTING` | Schlagen / Batting | **Batting** (immer) |
| `FIELDING` | Defense allgemein | Grundlagen |
| `DOUBLE_PLAY` | Double Play | Stationen |
| `BUNT_DEFENSE` | Bunt-Defense | Stationen |
| `COMINGS` | Comings (Catcher → Werfer) | Stationen |
| `PITCHER` | Pitcher | Stationen |
| `RELAY` | Relay / Cut-Off | Stationen |
| `PARTNER_ROUTINE` | Partner-Routine | Partnerdrills |

## DrillComplexity-Enum

Aus `domain/model/DrillComplexity.java`:

- **`BASIC`** (default): einfache Mechanik, ein Schritt, einzelner Ball, eine Entscheidung
- **`ADVANCED`**: mehrere Schritte hintereinander, schnelle Entscheidungen, mehrere Bälle, taktische Komplexität

## ID-Slug-Regeln

Aus `name` → `id`:

1. Lowercase
2. Umlaute mappen: `ä→a`, `ö→o`, `ü→u`, `ß→ss`
3. Sonderzeichen entfernen: `(`, `)`, `&`, `/`, `,`, `.`, `:`
4. Spaces → `-`
5. Mehrere `-` zu einem zusammenfassen
6. Leading/trailing `-` entfernen

### Beispiele

| Name | ID |
|---|---|
| Viereck-Drill (Toss & Wurf) | `viereck-drill-toss-wurf` |
| Aufwärmroutine der Dead Sox | `aufwarmroutine-der-dead-sox` |
| Sprintübung aus Fielding Position | `sprintubung-aus-fielding-position` |
| 1B Pickoff & Cover | `1b-pickoff-cover` |

## JSON-Format

Vollständiger Beispiel-Eintrag aus `drills.json`:

```json
{
  "id": "viereck-drill-toss-wurf",
  "name": "Viereck-Drill (Toss & Wurf)",
  "categories": [
    "THROWING"
  ],
  "minPlayers": 4,
  "equipment": [
    "Bälle",
    "4 Hütchen"
  ],
  "description": "Vier Hütchen im Rechteck aufstellen...\n\nAblauf: H1 wirft zu H2...",
  "hasImage": true,
  "pdfPage": 7,
  "rotation": "Nach jeder Aktion rennt man zur nächsten Position.",
  "variants": null,
  "complexity": "BASIC"
}
```

## Datei-Position

- Pfad: `backend/src/main/resources/drills.json`
- Format: JSON-Array, jedes Element ein Drill-Objekt
- Insertion: vor `]` mit `,` an vorherigem Eintrag — Reihenfolge nicht alphabetisch, neue Einträge dürfen ans Ende
- Backend lädt drills beim Start (DrillCatalogPort) — Restart nötig nach Änderung

## Validierung (per Hand)

Nach Insertion JSON-Syntax checken:
```bash
jq . backend/src/main/resources/drills.json > /dev/null
# Exit 0 = OK, sonst Syntax-Fehler
```

Drill-spezifische Validation passiert beim Backend-Start (Mapping zu `Drill.java`).
