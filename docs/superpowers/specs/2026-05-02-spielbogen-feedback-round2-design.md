# Spielbogen Feedback Round 2 — Design

**Datum:** 2026-05-02
**Scope:** 5 Feedback-Punkte aus zweitem Real-Use-Test (Hung) nach Merge von Round-1-Improvements.
**Ziel:** Verständlichkeit für Anfänger schärfen, redundante UX glätten, PDF-Lesbarkeit verbessern.

---

## A. FlyOut + 2 Outs → Picker skippen

### Problem
Aktuell: bei FlyOut + Runner auf Base öffnet immer `RunnerAdvancePickerView` (Tag-Up). Wenn `outs === 2` und Catch = 3rd Out → Inning beendet, Tag-Up-Runs zählen sowieso nicht. Picker ist sinnlos und nervig.

### Lösung
In `OutDetailDrawer.handleFielderTap` (`OutDetailDrawer.tsx:432-452`): wenn `pos >= 7` (Outfielder) UND `outs >= 2` → direkt FlyOut submitten ohne Picker:

```typescript
if (pos >= 7) {
  const hasAnyRunner = baseStateAfter && (
    baseStateAfter.firstSlotId != null ||
    baseStateAfter.secondSlotId != null ||
    baseStateAfter.thirdSlotId != null
  )
  if (hasAnyRunner && outs < 2) {
    setPendingFlyOutRequest({ fielder: pos })
  } else {
    onSubmit({
      result: 'OUT',
      outType: 'FLY',
      fielderChain: [pos],
      runsScored: 0,
      rbi: 0,
    })
  }
}
```

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Logik in `handleFielderTap`.

### Test
Vitest: `OutDetailDrawer` mit `outs=2`, Outfielder-Tap → direkt onSubmit ohne Picker (kein Tag-Up-View).

---

## B. PDF Römische Zahlen schwarz + bold

### Problem
`spielbogenPdfExport.ts:302` rendert `outIndex` (Römische Zahlen I/II/III für DP/TP) mit `setTextColor(120, 120, 120)` (mittelgrau). Auf gedrucktem Papier kaum lesbar.

### Lösung
Black + bold:

```typescript
if (cell?.outIndex) {
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')  // NEW
  doc.setTextColor(0, 0, 0)          // CHANGED from (120,120,120)
  doc.text(cell.outIndex, cellX + 1, cellY + 3)
  doc.setFont('helvetica', 'normal') // restore
  doc.setTextColor(0, 0, 0)
}
```

### Files
- `frontend/src/utils/spielbogenPdfExport.ts:302-304`

### Test
Manueller Smoke-Test (PDF-Export anzeigen) — Roman-Numerals sichtbar dunkler.

---

## C. Error-Button → Tier-2 (neben WALK)

### Problem
Aktuelle Lösung (Round 1): Error im AUS-Drawer mit amber-Visual. User hat Logik-Reversal: "Error = Batter safe, also würde Scorer nicht AUS drücken." Stimmt.

### Lösung
- **Neuer Tier-2-Button "ERROR"** in `BogenActionButtons` neben WALK/HBP. Subtitle: "Batter safe — Fielder-Fehler".
- Tap öffnet kleinen Drawer/Sheet "Welcher Fielder hatte den Fehler?" — gleicher Mini-Field-Picker wie im AUS-Drawer (Position 1-9). Tap → Submit `{result: 'OUT', isError: true, errorPosition: pos}` (gleiche on-wire-Form, computeBaseStateAdvance setzt Batter auf 1B).
- **Error-Option im AUS-Drawer entfernen** (jetzt redundant + verwirrend).
- Layout: Tier-2 wird `grid-cols-3` (WALK · HBP · ERROR) statt `grid-cols-2`.

### Visualität
Farbe-Konflikt: HBP ist bereits `amber-600`. ERROR-Button braucht distinct Farbe. Vorschlag: `orange-500` oder `rose-500` — semantisch nahe aber klar trennbar. Final-Decision im Plan: `orange-500` (warm/neutral, gut lesbar mit weißem Text).

### Files
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — neuer ERROR-Button + Drawer-Trigger.
- `frontend/src/components/spielbogen/ErrorPickerDrawer.tsx` (neu) — Mini-Field-Picker für errorPosition.
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Option aus `InfieldOptionsView` entfernen.
- Bestehende Tests in `OutDetailDrawer.test.tsx` (Error-Test) → in `ErrorPickerDrawer.test.tsx` verschieben/anpassen.

### Test
- Vitest neuer Test: ERROR-Button → Drawer → Fielder-Tap → submit shape `{result:'OUT', isError:true, errorPosition:N}`.
- Existing ROE-Test (Batter zu 1B safe) bleibt grün — Logik unverändert, nur UI-Pfad geändert.

---

## D. Runner-Out: Mini-Field-Chain-Picker

### Problem
`RunnerOutPickerView` (Fielder's Choice + Double Play) zeigt fix gerenderte Chain (`{fielder}-{defaultDpPartner}-3`). Real-Welt: SS taggt Runner an 2B kann via 5-6 (3B → SS), 4-6 (2B → SS), Solo (6) etc. sein. Anfänger versteht Notation nicht; Pro will Auswahl.

### Lösung
Nach Runner-Auswahl → **Chain-Picker** (statt Auto-Submit):

**Step 1**: "Wer hat den Runner getaggt?" — Mini-Field, ein Tap auf Fielder. Default = Fielder, der das AB initiierte (z.B. SS bei `5-4-3`-Chain).
**Step 2** (optional): "+ Wer hat geworfen?" — zweiter Tap fügt Assister vorne dran. Button "Solo (kein Wurf) → Bestätigen" submitten ohne 2nd Tap.
**Step 3**: "Bestätigen" submittet.

UI-Layout: Mini-Field SVG (gleich wie OutDetailDrawer-Field). Tap auf Position → highlight + chain-Anzeige unten ("Chain: 6 unassisted" oder "Chain: 5-6"). "Bestätigen"-Button dauerhaft sichtbar.

**Resultat-Beispiele:**
- 1 Tap auf SS (6) → Submit `{outType: 'FIELDERS_CHOICE', fielderChain: [6], ...}` → Notation: `Solo (6)`
- Tap 3B (5) → Tap SS (6) → Submit `{fielderChain: [5, 6], ...}` → Notation: `5-6`

**PDF-Rendering**: Chain als `chain.join('-')` (bestehende Logik). 2-3-Fielder-Chain `5-6-3` passt in DiamondCell-Notation-Slot.

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — `RunnerOutPickerView` erweitern um Chain-Picker-Step. Gleiche Logik wendet `submitDp` (Double Play) an.
- Beide Pfade: nach Runner-Auswahl Chain-Picker zeigen statt sofort Submit.

### Test
- Vitest: Runner-Out + 1 Tap → submit chain length 1.
- Vitest: Runner-Out + 2 Taps → submit chain length 2.

---

## E. Center-Flash combiniert Strikeout-Info bei 3rd-Out

### Problem
Strikeout-Flash (`SpielbogenPage.tsx:268-273`) zeigt 1.6s Flash. Wenn der Strikeout der 3rd Out ist → Center-Flash (3 OUTS Side-Switch) feuert gleichzeitig → 2 Animationen parallel, visuell unruhig.

### Lösung
- **Skip Strikeout-Flash** wenn projected outs >= 3.
- **Center-Flash Subtitle erweitern** um letzte AB-Info: `"Strikeout — Seitenwechsel"`.

Generisch: Center-Flash bekommt optionalen `lastOutType: 'strikeout' | 'fly' | 'grounder' | null` und Subtitle adapter:

```typescript
const flashSubtitle = lastOutType === 'strikeout' ? 'Strikeout · Seitenwechsel'
  : lastOutType === 'fly' ? 'Fly Out · Seitenwechsel'
  : lastOutType === 'grounder' ? 'Grounder Out · Seitenwechsel'
  : 'Seitenwechsel'
```

In `handleRecord` wenn `projectedOuts >= 3`:
- Skip Strikeout-Flash (`if (req.result === 'STRIKEOUT' && projectedOuts < 3)`).
- Skip Scored-Flash auch (Inning beendet, Runs zählen schon nicht — but tatsächlich relevant fall: scored vor 3rd Out — keep).
- Setze `sideSwitchFlash` mit `lastOutType` field.

### Files
- `frontend/src/components/spielbogen/SpielbogenPage.tsx`:
  - `sideSwitchFlash` State erweitert um `lastOutType?: 'strikeout' | 'fly' | 'grounder'`.
  - `handleRecord` Strikeout-Flash gated by `projectedOuts < 3`.
  - Center-Flash JSX subtitle adaptiv.

### Test
- Manuell-Smoke: Strikeout = 3rd Out → kein doppelter Flash. Subtitle "Strikeout — Seitenwechsel".

---

## Implementation-Reihenfolge

1. **A** — Trivial, sofort. (Skip Picker bei FlyOut+2-Outs)
2. **B** — Trivial PDF-Color-Tweak.
3. **E** — Klein, in einer Datei.
4. **C** — Architektur (neuer Button + Drawer).
5. **D** — Mini-Field-Picker, neue UX-Komponente.

Jeder Punkt isolierter Commit (Spielbogen-Konvention).

---

## Tests-Übersicht

| Punkt | Test |
|-------|------|
| A | Vitest OutDetailDrawer: outs=2 + OF-Tap → submit ohne Picker |
| B | Manuell: PDF-Export anzeigen, Roman dunkler |
| C | Vitest ErrorPickerDrawer: Tap Fielder → submit isError-Shape |
| D | Vitest OutDetailDrawer: Runner-Out + 1/2 Taps → chain length |
| E | Manuell: Strikeout=3rd-Out → kein Doppel-Flash |

---

## Open Questions

1. **C: Error-Drawer-Layout** — gleicher Vaul-Drawer wie OutDetailDrawer oder kleiner ResponsiveSheet? Empfehlung: ResponsiveSheet (kleiner Footprint, weniger Overhead).
2. **D: Position 1 (Pitcher) im Mini-Field-Picker?** — Pitcher kann auch taggen/werfen (Comebacker, Pickoff). Inkludieren. Position 2 (Catcher) auch (Tag at Home). Fields: 1-9 alle.
3. **E: Andere Out-Types als Subtitle?** — Foul-Out / Unassisted? Aktuell nur strikeout/fly/grounder. Generic-fallback "Out — Seitenwechsel" deckt Rest. OK so.

---

## Backward-Compat

- Frontend-only changes. Backend `SpielbogenAtBat`-Schema unchanged.
- Bestehende ROE-On-Wire-Form (`result: 'OUT', isError: true, errorPosition: N`) bleibt — nur UI-Pfad zu Error wandert von OutDetailDrawer zu eigenem Button + Drawer.
- `fielderChain` bleibt `number[]` — neue Picker fügt nur 1-2 Items hinzu.
- PDF-Rendering: längere Chain-Notation muss in DiamondCell passen (3-Fielder-Chain `5-6-3` ~ 5 chars, fitness check via Manuell-Test).
