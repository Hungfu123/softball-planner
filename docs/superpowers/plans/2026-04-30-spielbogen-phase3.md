# Spielbogen Phase 3 Implementation Plan — Liga-Sync + PDF + Cheatsheet

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Polish Phase 2 with optional Liga-Tabellen-Eintrag, PDF export of RFL sheet, notation cheatsheet drawer, and the copyFromGameDay UI in wizard.

**Architecture:** Adds endpoints + UI, no new tables. Liga-Result registration creates `LeagueResult` from existing tables. PDF export is frontend-only (jsPDF programmatic, A4 landscape, follows existing `pdfExport.ts` pattern). Cheatsheet is read-only static drawer.

**Spec reference:** `docs/superpowers/specs/2026-04-30-spielbogen-design.md`

---

## File Structure

### Backend (new files)
- `backend/src/main/java/com/softball/adapter/dto/RegisterLeagueResultRequest.java`
- Modifications:
  - `backend/src/main/java/com/softball/application/SpielbogenService.java` — add `registerLeagueResult()` method
  - `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` — add endpoint

### Frontend (new files)
- `frontend/src/utils/spielbogenPdfExport.ts` (jsPDF generator for RFL sheet PDF)
- `frontend/src/components/spielbogen/CheatsheetDrawer.tsx`
- `frontend/src/components/spielbogen/CopyFromGameDayModal.tsx`

### Frontend (modifications)
- `frontend/src/api/client.ts` — add registerLeagueResult function
- `frontend/src/components/spielbogen/RflSheetDrawer.tsx` — add "Als PDF" + "An Liga senden" buttons
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — wire up cheatsheet drawer in More menu
- `frontend/src/components/spielbogen/WizardStepLineup.tsx` — add "Aus Spieltag laden" button per side
- `frontend/src/types/index.ts` — add types if needed

---

## Backend Tasks

### Task 1: registerLeagueResult Endpoint

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenService.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/RegisterLeagueResultRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

- [ ] **Step 1: Read existing LeagueResultService and LeagueTeamService to understand API**

```bash
# Inspect:
# backend/src/main/java/com/softball/application/LeagueResultService.java
# backend/src/main/java/com/softball/application/LeagueTeamService.java
```

- [ ] **Step 2: Create RegisterLeagueResultRequest.java (optional, may not be needed if no body)**

Decide whether to accept any body. For simplicity, no body needed — just POST to endpoint.

- [ ] **Step 3: Add `registerLeagueResult` method to SpielbogenService**

Inject `LeagueTeamService` and `LeagueResultService` into SpielbogenService constructor.

```java
@Transactional
public LeagueResult registerLeagueResult(final Long bogenId) {
    Spielbogen bogen = findById(bogenId);
    if (bogen.getStatus() != BogenStatus.DONE) {
        throw new BusinessValidationException("Liga-Eintrag nur in Status DONE möglich (aktuell: " + bogen.getStatus() + ")");
    }
    if (bogen.getSeason() == null) {
        throw new BusinessValidationException("Spielbogen hat keine Saison zugeordnet — bitte erst eine Saison setzen");
    }
    if (bogen.getLeagueResult() != null) {
        throw new BusinessValidationException("Liga-Eintrag bereits registriert");
    }

    // Auto-create LeagueTeams if not existing
    LeagueTeam homeTeam = leagueTeamService.findOrCreateInSeason(bogen.getSeason().getId(), bogen.getHomeTeamName());
    LeagueTeam awayTeam = leagueTeamService.findOrCreateInSeason(bogen.getSeason().getId(), bogen.getAwayTeamName());

    if (Boolean.TRUE.equals(homeTeam.isOwnTeam()) || Boolean.TRUE.equals(awayTeam.isOwnTeam())) {
        throw new BusinessValidationException("Spielbogen kann keinen ownTeam-Eintrag erzeugen — eigenes Team kommt über Game-Score");
    }

    LeagueResult result = leagueResultService.create(
        bogen.getSeason().getId(),
        homeTeam.getId(),
        awayTeam.getId(),
        bogen.getHomeRuns(),
        bogen.getAwayRuns(),
        bogen.getDate()
    );

    bogen.setLeagueResult(result);
    bogenRepo.save(bogen);
    log.info("Spielbogen {} → LeagueResult {} registriert", bogenId, result.getId());
    return result;
}
```

VERIFY first if `LeagueTeamService.findOrCreateInSeason` exists. If not, check existing methods and adjust. If only `findById` exists, may need `findByName` + manual create. Adapt to actual API.

- [ ] **Step 4: Add controller endpoint**

```java
@PostMapping("/{id}/register-league-result")
public LeagueResultResponse registerLeagueResult(@PathVariable Long id) {
    var result = bogenService.registerLeagueResult(id);
    return LeagueResultResponse.from(result);  // assume from() exists
}
```

VERIFY `LeagueResultResponse` shape — adapt accordingly.

- [ ] **Step 5: Compile + tests**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
```

- [ ] **Step 6: Commit**

```bash
git commit -am "🏆 Spielbogen → Liga-Result-Registrierung Endpoint"
```

---

## Frontend Tasks

### Task 2: API Client + Wire Up Liga-Senden Button

- [ ] **Step 1: Add API function in `frontend/src/api/client.ts`:**

```typescript
export async function registerSpielbogenLeagueResult(bogenId: number): Promise<LeagueResultResponse> {
  return request<LeagueResultResponse>(`/spielbogen/${bogenId}/register-league-result`, { method: 'POST' })
}
```

If `LeagueResultResponse` type doesn't exist in frontend, add a minimal one or use `unknown`.

- [ ] **Step 2: Add button to `RflSheetDrawer.tsx`**

When `bogen.status === 'DONE'` and `bogen.season != null` and `bogen.leagueResultId == null`:
- Show button "🏆 An Liga senden" → calls registerSpielbogenLeagueResult(id) → toast "Liga-Tabelle aktualisiert" → reload

- [ ] **Step 3: Build + commit**

```bash
cd frontend && npm run build
git commit -am "🏆 Spielbogen Liga-Senden Button + API"
```

---

### Task 3: PDF Export

**File:** `frontend/src/utils/spielbogenPdfExport.ts`

Generate A4-landscape PDF following RFL 2023 template (refer to `/home/hungl/Downloads/RFL 2023 Scoresheet.pdf` if accessible).

Layout (mm in A4 landscape 297×210):
- Logo placeholder + "RFL — Ruhr-Fun-Liga Mixed Fastpitch Softball" header
- Right block: Ort/Datum/Zeit
- Two team banners (Gast / Heim) at Y=28
- Two sheet tables side-by-side (left + right) starting at Y=42
- Each table: 10 slot rows × 7 inning columns
- Each cell: small diamond (programmatic line drawing)
- Notation in cell: positioned text
- Footer per table: "erzielte Runs" with 7 inning boxes + total

Use `jsPDF + jspdf-autotable` (already in stack). Use `bogenSheetRenderer.ts` for cell labels.

```typescript
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { renderCells, cellKey } from './bogenSheetRenderer'
import type { BogenSheetResponse } from '@/types'

export function generateSpielbogenPdf(sheet: BogenSheetResponse): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  // ... drawing logic ...
  doc.save(`spielbogen-${sheet.meta.date}-${sheet.meta.homeTeamName}-vs-${sheet.meta.awayTeamName}.pdf`)
}
```

For the implementer: keep it pragmatic — V1 doesn't need pixel-perfect 1:1 RFL match. Functional PDF with header + 2 tables + notation labels is good enough. Diamonds can be simple line+rectangle for now.

- [ ] **Step 1: Implement spielbogenPdfExport.ts (~200-300 lines)**
- [ ] **Step 2: Wire up "Als PDF exportieren" button in RflSheetDrawer.tsx**
- [ ] **Step 3: Build + commit**

---

### Task 4: Cheatsheet Drawer

**File:** `frontend/src/components/spielbogen/CheatsheetDrawer.tsx`

ResponsiveSheet with sections (Hits, Outs, Walk/HBP, Stealing, Substitution). Each row: BIG notation symbol left + Klartext-Erklärung right. Optional client-side search filter.

```tsx
import { ResponsiveSheet } from '@/components/shared'

interface Props {
  open: boolean
  onClose: () => void
}

const ENTRIES = [
  { section: 'HITS', symbol: '1B', label: 'Single', description: 'Bahn von Home zu 1B' },
  { section: 'HITS', symbol: '2B', label: 'Double', description: 'Bahn bis 2B' },
  { section: 'HITS', symbol: '3B', label: 'Triple', description: 'Bahn bis 3B' },
  { section: 'HITS', symbol: 'HR', label: 'Homerun', description: 'Diamant komplett ausgemalt + Run' },
  { section: 'OUTS', symbol: 'K', label: 'Strikeout', description: 'Schwung-Strikeout' },
  { section: 'OUTS', symbol: 'F8', label: 'Fly Out', description: 'CF fängt Fly-Ball' },
  { section: 'OUTS', symbol: '6-3', label: 'Grounder', description: 'SS wirft zu 1B → Out' },
  { section: 'OUTS', symbol: 'DP', label: 'Double Play', description: 'Zwei Outs gleichzeitig' },
  { section: 'OUTS', symbol: 'E5', label: 'Error', description: 'Position 5 (3B) verkackt — Spieler kommt auf Base' },
  { section: 'WALK', symbol: 'BB', label: 'Walk', description: 'Base on Balls — 4 Balls, geht zu 1B' },
  { section: 'WALK', symbol: 'HP', label: 'Hit by Pitch', description: 'Batter getroffen — geht zu 1B' },
  { section: 'STEAL', symbol: 'SB', label: 'Stolen Base', description: 'Runner stiehlt zur nächsten Base' },
  { section: 'STEAL', symbol: 'CS', label: 'Caught Stealing', description: 'Runner wird beim Stehlen getaggt → Out' },
  { section: 'SUB', symbol: '↔', label: 'Substitution', description: 'Spieler ausgewechselt — neuer Name unter altem' },
]

export function CheatsheetDrawer({ open, onClose }: Props) {
  // Render groups
}
```

- [ ] **Step 1: Implement**
- [ ] **Step 2: Add to More-menu in BogenActionButtons** → opens CheatsheetDrawer
- [ ] **Step 3: Build + commit**

---

### Task 5: copyFromGameDay UI in Wizard

**File:** `frontend/src/components/spielbogen/CopyFromGameDayModal.tsx`

ResponsiveSheet that lists user's GameDays from current/all seasons. Selecting one → calls `copySpielbogenLineupFromGameDay` API.

Add button "Aus Spieltag laden" in `WizardStepLineup.tsx` next to mode toggles (only visible for current `activeSide`). Button opens modal.

Note: The API endpoint already exists from Phase 1 (`/spielbogen/{id}/lineup/copy-from-gameday`). This task only adds UI.

Caveat: When wizard hasn't created the bogen yet, this won't work — copy-from-gameday API requires existing bogen. Solution: Show button only when modifying an existing DRAFT bogen (i.e., user reopened a draft). For initial wizard flow, skip the button.

OR simpler: also save lineup-state-only locally (don't hit API), and apply copied lineup as in-memory slot list. This avoids needing an existing bogen.

- [ ] **Step 1: Add "Aus Spieltag laden" button to WizardStepLineup (active side only)**
- [ ] **Step 2: Implement modal that lists user's GameDays + Games, selecting fills `slots` via local state**
- [ ] **Step 3: Wire up + commit**

---

## Manual E2E

After all tasks complete:
1. Create bogen via wizard → start scoring
2. Score a few at-bats
3. Open Sheet drawer → "Als PDF" → PDF downloads
4. End game → "An Liga senden" (if season set) → check Liga-Tabelle in Dashboard
5. Open Cheatsheet from More-menu → see notation table
6. New wizard for our team → use "Aus Spieltag laden" → lineup pre-filled

---

## Self-Review Checklist

- [ ] Liga-Result registration endpoint works
- [ ] Cannot register twice (idempotent rejection)
- [ ] Cannot register without seasonId
- [ ] PDF export generates valid file
- [ ] Cheatsheet shows all notation
- [ ] copyFromGameDay UI works in wizard

## Out of Scope

- Pixel-perfect RFL PDF (functional reasonable approximation OK for V1)
- Stealing event recorder UI (button visible but recorder is V2)
- Tour bubbles (LocalStorage flag-based first-time-tour from spec — V2)
