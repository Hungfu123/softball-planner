---
name: drill-onboarding
description: Use when user adds new drill to Dead Sox softball-planner project. Triggers on phrases like "neuer drill", "drill hinzufuegen", "drill aufnehmen", "neue uebung", "add a drill". Loads roter-faden.md and drill-schema.md, classifies drill into training phase, asks targeted questions for missing fields, appends entry to backend/src/main/resources/drills.json.
---

# Drill Onboarding

Wenn User einen neuen Drill aufnehmen will, läuft dieser Workflow ab.

## Trigger
- "neuer drill" / "drill hinzufügen" / "drill aufnehmen" / "neue übung"
- "add a drill" / "add new drill"
- User beschreibt einen Drill und bittet ihn in `drills.json` aufzunehmen

## Workflow

1. **Lese Referenz-Dateien** in dieser Reihenfolge:
   - `roter-faden.md` — Phasen + DrillCategory-Mapping
   - `drill-schema.md` — Felder + Enums + ID-Slug-Regeln

2. **Inferiere aus User-Beschreibung:**
   - **Phase** (Aufwärmen / Partnerdrills / Grundlagen / Stationen / Batting)
   - **`categories[]`** (eine oder mehrere — z.B. THROWING + FIELDING)
   - **`complexity`** (BASIC default; ADVANCED nur wenn mehrere Schritte / schnelle Entscheidungen / mehrere Bälle)
   - **`id`** (Slug nach Regeln in drill-schema.md)
   - **`hasImage`** (false default — true nur wenn User Bild im Handbuch erwähnt)

3. **Proposed Draft-JSON** an User zeigen mit inferierten Feldern.

4. **AskUserQuestion** für unklare Pflichtfelder (jede Frage einzeln):
   - `minPlayers` — Minimum Spieler für Durchführbarkeit
   - `equipment` — Liste (kann leer sein)
   - `pdfPage` — im PDF-Handbuch? wenn ja: Seite
   - `rotation` — wie rotieren Spieler / wer macht mit
   - `variants` — optional (skippen wenn nicht erwähnt)

5. **Final-JSON präsentieren**, User confirm.

6. **Append zu `backend/src/main/resources/drills.json`:**
   - Letzte `}` finden, Komma einfügen, neues Objekt anhängen, schließendes `]` belassen
   - Verwende Read um aktuellen Stand zu sehen, dann Edit für exakte Insertion

7. **Hinweis an User:** "Backend-Restart nötig damit Drill geladen wird." Optional: `npm run build` für Frontend wenn Drill in UI auftauchen soll.

## Wichtig

- **NICHT** automatisch backend restarten
- **NICHT** in PDF-Handbuch einfügen (out of scope)
- **NICHT** ID-Existenz validieren — User-Verantwortung
- Bei Mehrfachzuordnung zu Phasen: HITTING → IMMER Batting-Phase, auch wenn andere Categories vorhanden
- ID-Slug ASCII (ä→a, ö→o, ü→u, ß→ss), kebab-case
