# Spielbogen Feedback-Improvements — Design

**Datum:** 2026-05-01
**Scope:** UX/Bugfix-Pass auf Spielbogen-Feature nach erstem Real-Use-Test (Hung). Sechs Punkte.
**Ziel:** Anfänger-tauglich (Softball-Neulinge sollen scoren können), Bugs raus, klarere Notification-Hierarchie.

---

## 1. Error-Button — "Reached on Error" (ROE)

### Problem
- `OutDetailDrawer.tsx:174` zeigt pro Infielder `Error E{n}` als Out-Option.
- Submit: `result: 'OUT', isError: true, errorPosition: fielder` ohne `baseStateAfter`.
- `handleOutSubmit` (BogenActionButtons.tsx:88) ruft `computeBaseStateAdvance` mit `result: 'OUT'` → keine Batter-Bewegung. **Batter verschwindet vom Diamond.**
- Real-Verhalten in Softball: bei Error erreicht Batter eine Base (meist 1B) safe — kein Out.

### Lösung
- **Behalten** im AUS-Drawer (Workflow stimmt: User dachte Out, fielder hat verbockt).
- **Visuell distinct:** Eigene Sektion mit Divider, amber-Farbe statt grau.
- **Label:** `Sicher an 1B durch Fehler (E{n})` + Subtitle *"Batter safe — kein Out, Fielder hat Fehler"*.
- **Logik-Fix:** Frontend `computeBaseStateAdvance` erweitern — wenn `isError=true` mit `result=OUT`, Batter wie SINGLE platzieren (Batter→1B, 1B→2B, 2B→3B, 3B→Home).
- **Optional Runner-Advance editieren:** Bei vorhandenen Runnern `RunnerAdvancePickerView` mit Default *"alle +1"* anzeigen, damit Scorer korrigieren kann (Runner kann auch +2 weiterlaufen wenn Ball ins Outfield rollt).
- **Backend:** Keine Änderung nötig. `result=OUT + isError=true` ist bereits die etablierte On-Wire-Form. `computeOuts` filtert isError korrekt; Stats-Calc (Spielbogen) muss eventuell angepasst werden — siehe **Open Questions**.

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Error-Option neu rendern (amber, Divider, Subtitle).
- `frontend/src/utils/bogenBaseAdvance.ts` — `computeBaseStateAdvance` erweitern mit `isError`-Flag.
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — `handleOutSubmit` muss `isError` an `computeBaseStateAdvance` durchreichen.

---

## 2. Runner-Advance Visualisierung

### Problem
- Diamond updated stumm. Nur HR + Scored Runs flashen (`SpielbogenPage.tsx:248-313`).
- Bei Grounder mit Runner-Advance / Fly-Tag-Up sieht User nicht, dass Runner sich bewegt hat.

### Lösung
- **Runner-Bewegung im Diamond ist schon animiert** (`BogenDiamondView.tsx` Runner-Komponente keyframet via motion). Aber 0.3-0.8s Bewegung ist subtil → User schaut woanders hin.
- **Zusätzliches Flash:** "Runner advanced" Toast/Mini-Banner unter Diamond (1.2s):
  - `Anna → 2B` (oder bei mehreren: `2 Runner advanced`)
  - Stil: cream-50 mit emerald-300 border, subtler als HR-Flash, größer als Toast.
- **Trigger-Logik:** In `handleRecord` baseStateAfter mit baseStateBefore vergleichen — wenn Runner-Position sich geändert hat (ohne Run zu scoren, das ist schon abgedeckt) → Advance-Flash.
- **Reduce-Motion:** respect `prefers-reduced-motion`.

### Files
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — neuer State `advanceFlash`, computed im `handleRecord`-Effect.

---

## 3. 3-Outs-Side-Switch Notification

### Problem
- Inning-Switch-Banner aktuell: `bg-navy-800` Top-Strip, 2.5s, leicht.
- Toast aktuell: emerald-200/cream-50 — grün, "freundlich", übersehbar.
- Während User auf Action-Buttons (unten) fokussiert ist, geht Top-Banner unter.

### Lösung (Combo: rot + Animation)
- **Toast-Farbe:** Bei 3-Out-Switch Toast als `error`-Variant (`softball-red-300/red-900`) statt success → fällt auf.
- **Vollbild-Center-Flash:** Neues Overlay (1.0s) mit:
  - Vollbild-Backdrop `bg-softball-red-700/85` (semi-transparent rot).
  - Center-Text: `3 OUTS` (sehr groß, font-display, weiß).
  - Sub: `Seitenwechsel — {NEW_TEAM} schlägt jetzt`.
  - Pfeil-Icon (↓/↑ je nach Side-Switch).
  - Slide-out nach 0.8s, fade-out bis 1.2s.
- **Vibration:** `navigator.vibrate([100, 50, 100, 50, 200])` (länger als HR).
- Top-Banner kann bleiben oder weg (Center-Flash macht ihn redundant; **Recommendation: Top-Banner ersetzen** durch Center-Flash, weniger UI-Kram).

### Files
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — `inningSwitchFlash` ersetzen mit `sideSwitchOverlay`-State + Overlay-Markup.
- Toast-Aufruf bei Side-Switch (`SpielbogenPage.tsx:181-183`) auf `'error'` umstellen.

---

## 4. Bug: 2 Outs + FlyOut + Runner Advance

### Problem
- `handleFlyOutConfirm` (`OutDetailDrawer.tsx:454-467`) berechnet `runs` aus `applyAdvances`, unabhängig von outs-state.
- Real-Regel: Catch ist Out. Wenn vor dem Catch 2 Outs → Catch ist 3rd Out → **inning ist beendet bevor Runner über Home laufen kann**. Run zählt nicht.
- Aktuell wird Run bei `2 outs + Fly` gewertet → **Score falsch**.

### Lösung
- `OutDetailDrawer` braucht `outs`-Prop (current outs vor diesem AB).
- In `handleFlyOutConfirm`: wenn `outs === 2` → `runsScored = 0, rbi = 0`. Runner-Bewegung im baseStateAfter trotzdem visualisieren (irrelevant nachher, weil Inning rum), aber Run nicht zählen.
- Sac-Fly-Toggle bei `outs === 2` ausgrauen (Sac Fly per definition: Run scored on caught fly → mit 3rd-out-catch unmöglich).
- Confirm-Hinweis: `2 Outs — Catch beendet Inning, Runs zählen nicht`.

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Prop `outs: number`, Logik in `handleFlyOutConfirm` + Sac-Fly-Toggle-Disable.
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — `outs` durchreichen.
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — `outs` an `BogenActionButtons` übergeben (schon dort berechnet).

### Test
- Vitest: `OutDetailDrawer` mit `outs=2`, FlyOut + Runner3B-tag-up → erwartet `runsScored=0`.

---

## 5. Sacrifice-Bunt Erklärung (Help-Text)

### Problem
- Toggle-Label `Als Sacrifice Bunt werten (SH)` ohne Erklärung. User weiß nicht wann ankreuzen.

### Lösung
- Tooltip/Help-Icon (`?`) neben Toggle, Tap öffnet kleinen Info-Popover:
  > **Sacrifice Bunt (SH)**
  > Batter buntet absichtlich, damit Runner advancen kann. Batter wird out an 1B — opfert sich.
  > **Wann ankreuzen:** Batter hat absichtlich gebuntet um Runner weiterzubringen.
  > **Wirkung:** AB zählt nicht für AVG → Batter-AVG bleibt geschützt.
- Gleiches für `Sacrifice Fly (SF)`-Toggle:
  > **Sacrifice Fly (SF)**
  > Batter schlägt Fly Ball ins Outfield. Catcher fängt → Batter out. Aber: Runner von 3B taggt up und scored.
  > **Wann ankreuzen:** Mindestens 1 Run wegen Tag-Up. Nur möglich bei < 2 Outs.
  > **Wirkung:** AB zählt nicht für AVG.

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx` — Help-Icon + Popover-Component (kleines Vaul-Drawer-Sub oder simpler `<details>`).
- Eventuell shared `<HelpPopover>`-Komponente in `frontend/src/components/shared/` falls gut wiederverwendbar.

---

## 6. Grounder + Throw zu 1B + Runner-Advance

### Problem
- Default-Advance ist "stays put" (`computeBaseStateAdvance` für OUT/non-DP).
- Versteckte Option `⚙ Runner-Advance editieren` wird oft übersehen.
- Real-Regel: Throw zu 1B macht Batter out, aber Force für Runner auf 1B fällt weg → Runner kann zu 2B weiterlaufen.

### Lösung (für Anfänger)
- **Wenn Runner auf Base + Grounder/Solo-Out:** automatisch `RunnerAdvancePickerView` öffnen statt direkt submitten.
- Picker pre-filled mit smart defaults:
  - **Throw-zu-1B (Batter out):** Force-Removal-Logik:
    - Runner auf 1B + Throw zu 1B (`fielderChain` ends in `3`) → default `1B → 2B` (Force weg, aggressiv-spielende Runner)
    - Runner auf 2B + Throw zu 1B → default `bleibt auf 2B` (kein Force, kein Druck)
    - Runner auf 3B + Throw zu 1B → default `bleibt auf 3B` (kein Force)
  - **Throw-zu-2B / DP-Versuch:** Force greift → andere Defaults (siehe DP-Path).
- Anfänger sieht: "Ah Runner kann advancen, default passt" → 1 Tap "Bestätigen".
- Erfahrene Scorer: Tap zum Korrigieren → Bestätigen.
- Klares Cycling: bleibt → 2B → 3B → Home → bleibt (schon vorhanden).
- **Hinweis im Picker:** Subtitle "Smart-Default basierend auf Throw-Target — anpassen wenn Runner anders gelaufen ist".

### Files
- `frontend/src/components/spielbogen/OutDetailDrawer.tsx`:
  - `handleGrounderOut` aufteilen: bei `hasRunners` immer Picker öffnen (statt direkt submit).
  - `RunnerAdvancePickerView` braucht `defaultTargets`-Prop.
  - Smart-Default-Logik: neue Helper-Funktion `computeForceDefaults(baseState, throwTarget): Record<1|2|3, 1|2|3|4>`.

### Test
- Vitest: Runner1B + Grounder 6-3 → defaults `{1: 2, 2: 2, 3: 3}`.
- Vitest: Runner2B + Grounder 6-3 → defaults `{1: 1, 2: 2, 3: 3}` (kein Advance default).

---

## Open Questions

1. **Spielbogen Stats-Calc — wo lebt das?** Aktuell sehe ich nur `BattingStatsCalculator` für `AtBat` (legacy). Wenn Spielbogen separate Stats-Berechnung hat, muss `isError`-Behandlung dort auch korrekt sein (AB+1 wenn ROE, kein Hit). **Action:** vor Implementation prüfen ob `SpielbogenStatsCalculator` o.ä. existiert + isError handhabt.

2. **`REACHED_ON_ERROR` als eigener AtBatResult?** Saubere Modellierung wäre eigener Enum-Wert (Backend Domain + DB-Migration). Aktuell punted: bleibt result=OUT + isError=true. Markieren als Tech-Debt für später, wenn Stats expanded werden.

3. **Center-Flash bei jedem Side-Switch oder nur bei Auto-Switch (3-Out)?** Empfehle: nur bei Auto-Switch (3 Outs reached). Manueller Side-Switch via Picker = User weiß was er tut, kein Brimborium.

---

## Implementation-Reihenfolge

1. **Bug 4 (FlyOut + 2 Outs)** — kritischer Score-Bug, zuerst.
2. **Error-ROE-Fix (1)** — Batter verschwindet, ebenfalls hoher Severity.
3. **Smart Runner-Advance (6)** — UX-Win für Anfänger.
4. **3-Outs Center-Flash (3)** — Sichtbarkeit.
5. **Runner-Advance-Flash (2)** — Polish.
6. **SH/SF Help-Popover (5)** — Polish.

Jeder Punkt isolierter Commit (Spielbogen-Konvention sichtbar im Log).

---

## Tests

- Vitest neue/erweiterte Tests:
  - `OutDetailDrawer.test.tsx`: Error-Path → Batter auf 1B; FlyOut + 2 Outs → no runs.
  - `bogenBaseAdvance.test.ts` (neu falls nicht da): isError-Handling, Force-Default-Logik.
  - `BogenDiamondView.test.tsx` (existiert): Runner-Advance-Flash visible.

Build vor Commit (`npm run build` + relevante Vitests).
