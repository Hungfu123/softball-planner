# Lineup-Row Player-Swap

## Ziel

Auf einer Lineup-Row (im Lineup-Editor) Person tauschen — analog zum bestehenden Field-Swap (`FieldPositionAssignSheet`). User klickt/tappt den Spieler-Namen einer Lineup-Row, ein Sheet öffnet sich mit auswählbaren Alternativen (Pool + andere Lineup-Player). Auswahl führt zum Swap.

## Motivation

- Aktuell: Person-Wechsel in Lineup geht nur über Remove + Add-from-Pool oder über Field-Swap.
- Field-Swap ist Position-zentrisch ("Wer steht auf SS?"). Lineup-Swap ist Person-zentrisch ("Diesen Spieler ersetzen / mit anderem tauschen").
- DnD-Sort umsortiert Batting-Order, ersetzt aber keine Personen.
- Mobile besonders relevant: schnelle Korrektur ohne Pool aufzuklappen.

## Trigger / UX

### Trigger
- **Klick/Tap auf Player-Name-Span** in `LineupRow`.
- Drag-Handle, Position-Select, DH-Picker, Move-Buttons, Remove-Button bleiben separate Tap-Targets.

### Desktop
- Hover-State auf Name-Span: `bg-cream-100` + Pencil-Cursor (`cursor-text`-pencil-Custom) + inline Tausch-Icon (↔ / SwapIcon) rechts neben Name (group/row hover-reveal, opacity-0 → opacity-100).

### Mobile
- Persistentes low-opacity Tausch-Icon (↔, `opacity-40`) inline rechts neben Name als statische Affordance.
- Kein Hover verfügbar — Icon muss sichtbar bleiben, sonst undiscoverable.

### Drag-Drop-Sicherheit
- DnD aktiviert ausschließlich über GripHandle (`touch-none` + `PointerSensor distance: 8` / `TouchSensor delay: 150ms`).
- Tap auf Name = Click (kein Drag-Trigger). Kein Konflikt.

## Sheet — `LineupRowSwapSheet`

### Position
- Neue Datei `frontend/src/components/planner/LineupRowSwapSheet.tsx`.
- Verwendet `ResponsiveSheet` (gleiche Komponente wie `FieldPositionAssignSheet`).

### Props
```ts
interface Props {
  open: boolean
  row: LocalLineupEntry | null
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onSwapWithPool: (rowPlayerId: number, poolPlayerId: number) => void
  onSwapWithLineup: (rowPlayerId: number, otherRowPlayerId: number) => void
  onClose: () => void
}
```

### Inhalt (Reihenfolge)
1. **Aktuell:** Header zeigt aktuellen Spieler + Batting-Order + Position (falls vorhanden).
2. **Tauschen mit Lineup-Spieler:** Grid mit allen anderen `entries` außer der aktuellen Row. Jede Karte zeigt Name + (Batting#) + Position.
3. **Ersetzen aus Pool:** Grid mit `poolPlayers`. Karte zeigt nur Name.
4. **Footer:** "Abbrechen".

### Buttons
- Click auf Lineup-Karte → `onSwapWithLineup(currentRowPlayerId, otherPlayerId)` + Close.
- Click auf Pool-Karte → `onSwapWithPool(currentRowPlayerId, poolPlayerId)` + Close.

## Swap-Semantik

### Pool-Swap (`onSwapWithPool`)
- Ersetzt Person der Row.
- Batting-Order bleibt (Row-Index ändert sich nicht).
- Position bleibt (z.B. SS bleibt SS, jetzt mit neuem Spieler).
- DH-Annotation auf dieser Row bleibt erhalten (DH-Batter ist eigene Person, unverändert).
- Falls neuer Spieler aktuell DH-Batter einer anderen Row ist → DH-Annotation muss aufgelöst werden (Validation-Regel: DH-Batter muss Bench-Player sein).
- Implementation: Frontend ruft Backend `setLineup`-Endpoint mit komplettem neuen Entry-Array, Backend validiert.

### Lineup-Swap (`onSwapWithLineup`)
- Zwei Lineup-Rows tauschen Batting-Order-Plätze.
- Person + Position + DH-Annotation wandern **mit** dem Spieler (entry-Objekt wandert komplett, nur `battingOrder`/Index tauscht).
- Identisch zu DnD-Reorder, nur per Tap.
- Implementation: Frontend tauscht beide Entries im Array, ruft Backend `setLineup`.

### Backend
- **Kein neuer Endpoint nötig.** Bestehender `POST /api/games/{id}/lineup` (Set-Lineup mit komplettem Array) reicht.
- `LineupValidator` läuft wie bisher (Batting-Order-Sequence, Position-Uniqueness, DH-Regeln).

## Frontend-Änderungen

### `LineupRow.tsx`
- Name-Span klickbar machen (`<button>` oder `<span role="button">` + Tailwind hover-states).
- Pencil-Cursor via existing Custom-Cursor-Klasse (siehe Project-Pref).
- SwapIcon (neu in `icons/index.tsx` falls noch nicht da) — `↔`/`ArrowsLeftRight`.
- Neue Prop `onOpenSwap: (entry: LocalLineupEntry) => void`.

### `LineupEditor.tsx`
- State: `swapRow: LocalLineupEntry | null`.
- Render `LineupRowSwapSheet` mit `open={swapRow !== null}`, `row={swapRow}`, etc.
- Neue Props: `onSwapWithPool`, `onSwapWithLineup` durchreichen vom Parent (`GameDayPlanner`).

### `GameDayPlanner.tsx`
- Neue Handler `handleSwapWithPool` / `handleSwapWithLineup`.
- Beide manipulieren das Lineup-Array und rufen denselben Save-Pfad wie der bestehende Lineup-Save.

### Icons
- Falls `ArrowsLeftRight`/`SwapIcon` nicht existiert → in `frontend/src/icons/index.tsx` hinzufügen (Custom SVG, kein lucide).

## Testing

### Manuell
- Desktop:
  - Hover auf Name → bg + pencil cursor + Icon sichtbar.
  - Klick öffnet Sheet, beide Sektionen sichtbar.
  - Pool-Pick: Person ersetzt, Position/Order/DH bleiben.
  - Lineup-Pick: zwei Rows tauschen Plätze, Position+DH wandert mit.
- Mobile (≤640px):
  - Static Tausch-Icon sichtbar an Name.
  - Tap auf Name öffnet Sheet (kein Drag-Trigger).
  - Drag-Sort funktioniert weiterhin nur über GripHandle.
- DH-Edgecase: Swap-Person ist aktuell DH-Batter einer anderen Row → Backend wirft 400, Toast zeigt Fehler.

### E2E (optional)
- Playwright-Suite (`frontend/npm run test:e2e`) ist scoring-fokussiert — kein Lineup-Editor-Coverage nötig hier.

## Out of Scope

- Backend-Änderungen: keine.
- DnD-Behavior: unverändert.
- Field-Swap: unverändert.
- Substitution (Live-Spiel): unverändert, eigener Editor.
- Carpool / Staff: unbeeinflusst.

## Risiken / Offene Punkte

- **Discoverability mobile:** Static Icon im Row könnte als Decoration interpretiert werden. Mitigation: Icon klein aber distinct, evtl. erste Use → Tooltip/Hint einmal (optional, nicht Teil v1).
- **DH-Edgecase Pool-Swap:** Falls Pool-Player DH-Batter einer anderen Row ist, schlägt Backend-Validation fehl. Frontend könnte vorab filtern → Pool-Liste exkludiert aktive DH-Batter. Entscheidung: filtern, klarer als Fehler-Toast.
- **Truncate Name in Sheet-Card:** Lange Namen brechen ggf. — analog Field-Sheet truncate.
