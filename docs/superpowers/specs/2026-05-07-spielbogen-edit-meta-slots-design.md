# Spielbogen Edit Meta + Slots — Design

## Context

Aktuell kann ein Spielbogen nach dem Erstellen via Wizard nicht mehr editiert werden:
- **Team-Namen, Datum, Ort**: nur im Wizard initial setzbar. Nachträglich kein UI.
- **Player-Namen / Positions / Batting-Order der Lineup-Slots**: nur im Wizard. Mid-game-Wechsel via SubstitutionDrawer (legt Substitution-Record an, mutiert slot.name) oder neu via PositionSwapDrawer (für Position). Aber: einfache Tippfehler-Korrektur ohne Audit-Record nicht möglich.

User-Bedarf: nach Bogen-Erstellung sollen Meta-Daten und einzelne Lineup-Einträge korrigierbar sein (z.B. falsch geschriebener Name, vergessenes Datum, Ort-Tippfehler).

Backend bereits vorhanden:
- `PATCH /api/spielbogen/{id}` — UpdateSpielbogenRequest (date, location, homeTeamName, awayTeamName, seasonId).
- `PATCH /api/spielbogen/{id}/slots/{slotId}` — UpdateSlotRequest (name, position, battingOrder).

Ziel: Frontend-UI für beide Endpoints. Kein Backend-Aufwand.

## Approach

**Modal-basierte Edit-UI für Meta + Slot, separat ausgelöst.**

- **Meta-Edit**: Pencil-Icon im Header der SpielbogenPage (neben Team-Namen) öffnet `BogenMetaEditModal` mit Form-Fields für homeTeamName, awayTeamName, date, location.
- **Slot-Edit**: Pencil-Icon pro Slot in der RflSheetDrawer-Tabelle (Hover-Reveal-Style, bestehendes Pattern) öffnet `BogenSlotEditModal` mit Form-Fields für name, position, battingOrder.

Beide Modals nutzen existierende `ConfirmModal`/`Modal`-Pattern (dark-backdrop, deutsche Labels).

**Verworfen:**
- **Inline-Edit** (click-to-edit Field): fragil bei Mobile, kein einheitliches Pattern in Codebase.
- **Wizard-Reuse**: Wizard ist Multi-Step, overkill für einzelne Felder. Auch UX-verwirrend (User würde wieder Lineup-Setup gezeigt bekommen).

**Status-Restriktion:**
- Edit in **allen Status** (DRAFT, LIVE, DONE) erlaubt. Backend hat keine Status-Check (Update geht via `bogenService.update()`).
- **Warning bei DONE + LeagueResult-registriert**: Modal zeigt Hinweis "Liga-Tabelle ist bereits aktualisiert — Änderungen werden nicht zurückgespielt." User kann trotzdem editieren (kein hard-block).
- Slot-Edit bei LIVE: möglich, aber User wird gewarnt: "Bei laufendem Spiel ändert sich nur der aktuelle Slot-Name. Audit-Trail über SubstitutionDrawer nutzen wenn Spieler-Wechsel."

## Components

### Frontend-Files

**Neu:**
- `frontend/src/components/spielbogen/BogenMetaEditModal.tsx` — Modal mit Form für Bogen-Meta.
- `frontend/src/components/spielbogen/BogenSlotEditModal.tsx` — Modal mit Form für Slot.

**Modifiziert:**
- `frontend/src/api/client.ts` — neue Functions `updateSpielbogen(id, req)` und `updateSpielbogenSlot(id, slotId, req)` (falls letztere noch nicht existiert).
- `frontend/src/types/index.ts` — `UpdateSpielbogenRequest`, `UpdateSlotRequest` Types.
- `frontend/src/hooks/useSpielbogenScoring.ts` — `updateMeta(req)` und `updateSlot(slotId, req)` Hook-Funktionen, die nach Save Sheet reloaden.
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — Pencil-Button im Header neben Team-Names, State + Handler für Meta-Modal.
- `frontend/src/components/spielbogen/RflSheetDrawer.tsx` — Pencil-Spalte/Icon pro Slot-Row, State + Handler für Slot-Modal.

### BogenMetaEditModal Specs

Props: `{ open, onClose, meta: SpielbogenResponse, onSubmit: (req) => Promise<void> }`

Form-Fields (deutsche Labels):
- Heim-Team-Name (text, required, max 100)
- Gast-Team-Name (text, required, max 100)
- Datum (date input, required)
- Ort (text, optional, max 100)

Submit:
- Validiere: beide Teamnamen non-empty, Datum gültig.
- Show DONE-Warning falls `meta.leagueResultId != null`.
- onClick → `await onSubmit({ homeTeamName, awayTeamName, date, location, seasonId: meta.season?.id ?? null })` → `onClose()`.

### BogenSlotEditModal Specs

Props: `{ open, onClose, slot: SpielbogenSlotResponse, onSubmit: (req) => Promise<void> }`

Form-Fields:
- Name (text, required, max 100)
- Position (Dropdown analog PositionSwapDrawer: P/C/1B/.../EH/DH oder leer)
- Batting-Order (number, 1-10)

Validation:
- Name non-empty.
- Position in VALID_POSITIONS oder null.
- BattingOrder 1-10.

Submit: `await onSubmit({ name, position, battingOrder })` → `onClose()`.

### Page-Integration

**SpielbogenPage Header** (existing structure):
```tsx
<div className="flex items-center gap-2">
  <h1>{meta.homeTeamName} vs {meta.awayTeamName}</h1>
  <button onClick={() => setShowMetaEdit(true)} aria-label="Bearbeiten">
    <Pencil size={16} />
  </button>
</div>
```

State: `const [showMetaEdit, setShowMetaEdit] = useState(false)`

Mount Modal:
```tsx
{showMetaEdit && (
  <BogenMetaEditModal
    open={showMetaEdit}
    onClose={() => setShowMetaEdit(false)}
    meta={sheet.meta}
    onSubmit={async (req) => {
      await updateMeta(req)
      toast.show('Spielbogen aktualisiert', 'success')
    }}
  />
)}
```

**RflSheetDrawer** (per Slot Pencil):
```tsx
<td className="...">
  <button
    onClick={() => setEditingSlot(slot)}
    className="actions-reveal p-1 text-gray-400 hover:text-navy-700"
    aria-label="Slot bearbeiten"
  >
    <Pencil size={14} />
  </button>
</td>
```

State + Modal-Mount analog Meta. Auf Mobile ggf. nur als Tap statt Hover-Reveal — konsistent mit existierenden Hover-Reveal-Patterns.

## Out of Scope (V1)

- **Bulk-Edit** mehrerer Slots gleichzeitig.
- **Undo** für Meta-Änderungen.
- **Batting-Order-Drag-Drop** auf Sheet (existiert nur im Wizard).
- **Liga-Result-Re-Sync** wenn Teamnamen nach Liga-Senden geändert werden — User wird gewarnt, muss manuell entscheiden.
- **Edit-Affordance auf SpielbogenList** (nur in Detail-View).

## File Inventory

**Neu:**
- `frontend/src/components/spielbogen/BogenMetaEditModal.tsx`
- `frontend/src/components/spielbogen/BogenSlotEditModal.tsx`

**Modifiziert:**
- `frontend/src/api/client.ts`
- `frontend/src/types/index.ts`
- `frontend/src/hooks/useSpielbogenScoring.ts`
- `frontend/src/components/spielbogen/SpielbogenPage.tsx`
- `frontend/src/components/spielbogen/RflSheetDrawer.tsx`

## Verification

1. `cd frontend && npm run build` — TypeScript clean.
2. `npm run lint` — keine neuen Errors.
3. **Manuell**:
   - Spielbogen erstellen, dann via Edit-Pencil Header öffnen → Teamnamen ändern → speichern → Sheet reloadet, neue Namen sichtbar.
   - Lineup-Slot per Pencil → Name korrigieren → speichern → Slot-Name aktualisiert in Sheet + PDF.
   - Bei LIVE-Bogen: Slot-Edit funktioniert ohne Substitution-Record-Anlage.
   - Bei DONE + LeagueResult-registriert: Warning sichtbar im Meta-Modal.
   - Validation: leerer Teamname → Submit deaktiviert + Fehlermeldung.
