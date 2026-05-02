# Spielbogen Round 2 — Auto-Mode-Prompt

Copy-paste ALLES unten in neue Claude Code Session (auto-mode / `acceptEdits`).

---

```
Du implementierst Round 2 von Spielbogen-Feedback-Improvements. Selbstständig alle 5 Tasks abarbeiten in der angegebenen Reihenfolge.

## Setup

- **Working directory:** /home/hungl/privat/softball-lineup/.worktrees/spielbogen-feedback-r2
- **Branch:** feature/spielbogen-feedback-r2 (bereits angelegt, HEAD: 572c006)
- **Baseline:** 33 vitest tests passing.
- **Spec:** docs/superpowers/specs/2026-05-02-spielbogen-feedback-round2-design.md
- **Plan (Quelle der Wahrheit, alle Code-Blöcke drin):** docs/superpowers/plans/2026-05-02-spielbogen-feedback-round2.md

## Regeln (CLAUDE.md)

- Conventional commits mit gitmoji prefix.
- **NO `Co-Authored-By` lines** in commits.
- German UI throughout (alle UI-Strings deutsch).
- TDD: failing test first → minimal impl → green test.
- Vor jedem Commit: `npm run build` muss grün sein, `npx vitest run` muss grün sein.
- Jeder Task = eigener Commit.
- Tier-2-Buttons in BogenActionButtons grid-cols-2 → grid-cols-3 wenn ERROR-Button hinzukommt.

## Host-Issue: Sandbox bwrap broken

Bubblewrap kann auf diesem Host kein Network-Namespace erstellen. Fehler: `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`.

→ Für ALLE Bash-Calls (auch grep/find/git log etc.) `dangerouslyDisableSandbox: true` setzen, ohne zu fragen.

## Workflow pro Task

1. Plan-Section lesen (`docs/superpowers/plans/2026-05-02-spielbogen-feedback-round2.md`).
2. Failing test schreiben (Code-Block aus Plan kopieren).
3. `npx vitest run <test-file>` → fail erwartet.
4. Implementation (Code-Blöcke aus Plan kopieren).
5. `npx vitest run` → alle grün.
6. `npm run build` → grün.
7. Commit mit exakter Message aus Plan.
8. Nächster Task.

## Tasks (Reihenfolge)

### Task 1 — FlyOut + 2 Outs Skip-Picker (Plan §"Task 1")
- File: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` `handleFielderTap`
- Test: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx`
- Commit: `🐛 Spielbogen: FlyOut bei 2 Outs überspringt Tag-Up-Picker (Inning beendet)`

### Task 2 — PDF Roman schwarz + bold (Plan §"Task 2")
- File: `frontend/src/utils/spielbogenPdfExport.ts:299-304`
- Commit: `🎨 Spielbogen PDF: Römische Out-Zahlen schwarz + bold (besser lesbar)`

### Task 3 — Center-Flash combiniert Strikeout-Info (Plan §"Task 3")
- File: `frontend/src/components/spielbogen/SpielbogenPage.tsx`
- State: `sideSwitchFlash` erweitern um `lastOutType?: 'strikeout' | 'fly' | 'grounder'`
- Logic: skip Strikeout-Flash wenn `projectedOuts >= 3`; Center-Flash subtitle adaptiv
- Commit: `✨ Spielbogen: Center-Flash zeigt Strikeout/Fly/Grounder bei 3rd-Out + skip Strikeout-Flash`

### Task 4 — ERROR Tier-2-Button + ErrorPickerDrawer (Plan §"Task 4")
- Create: `frontend/src/components/spielbogen/ErrorPickerDrawer.tsx`
- Create: `frontend/src/components/spielbogen/ErrorPickerDrawer.test.tsx`
- Modify: `frontend/src/components/spielbogen/BogenActionButtons.tsx` (neuer ERROR-Tier-2-Button orange-500, grid-cols-3)
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx` (Error-Option aus InfieldOptionsView entfernen)
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.test.tsx` (alten Error-Test entfernen)
- Commit: `✨ Spielbogen: ERROR Tier-2-Button + ErrorPickerDrawer (raus aus AUS-Drawer)`

### Task 5 — Mini-Field-Chain-Picker (Plan §"Task 5")
- Modify: `frontend/src/components/spielbogen/OutDetailDrawer.tsx`
  - Neue `ChainPickerView` Sub-Komponente
  - State `pendingChainPicker`
  - `handleRunnerOutPick` + `handleDpRunnerOut` zeigen ChainPicker statt direkt submit
  - `handleChainPickerConfirm`
- Tests: 2 neue Tests in OutDetailDrawer.test.tsx (Solo + 2-Tap)
- Commit: `✨ Spielbogen: Mini-Field-Chain-Picker für FC/DP Runner-Out (1-2 Taps)`

## Final Verification (nach Task 5)

```bash
cd /home/hungl/privat/softball-lineup/.worktrees/spielbogen-feedback-r2/frontend
npx vitest run            # alle grün
npm run build             # clean
npm run lint              # neue Errors müssen None sein (8 pre-existing OK)
```

Manuell-Smoke (Schritte aus Plan §"Final Verification"):
1. FlyOut bei 2 Outs → kein Tag-Up-Picker, direkt Submit.
2. PDF-Export → Roman-Zahlen schwarz + bold.
3. Strikeout=3rd-Out → kein Doppel-Flash, Center "STRIKEOUT · SEITENWECHSEL".
4. ERROR-Button Tier-2 (orange) → Drawer → Fielder-Tap → Batter auf 1B safe.
5. FC oder DP → Chain-Picker mit Mini-Field → Solo oder Multi-Tap → Confirm.

## Report-Format am Ende

Liste:
- 5 Commit-SHAs
- Test-Counter (vorher 33, nachher mehr)
- Build-Status
- Lint-Status
- Smoke-Test-Beobachtungen falls relevant

## Wichtig

- Plan-Code-Blöcke verbatim übernehmen — wenn etwas nicht klappt, im Plan nachsehen ob Hinweis dazu da. Nicht raten.
- Bei Mehrdeutigkeit: stop + escalate, nicht selbst entscheiden.
- Spielbogen-Tests müssen weiter grün bleiben (33 baseline).
- Wenn fertig: alles auf master mergen mit `--no-ff`, push origin master.
```

---

**Use:** in neuer Claude Code Session prompt einfügen, auto-mode einschalten (`shift+tab`), Enter.
