# Spielbogen Undo Mid-Inning Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Undo-Button so it operates on the latest action of the **current side + current inning** (AB or Stealing-Event), and never accidentally reverts to a prior side's half-inning when only a stealing-event was recorded.

**Architecture:** Frontend computes `latestAction` (newest AB or Stealing chronologically on currentSide+inning). Undo dispatches to either AB-undo or Stealing-undo backend endpoint. Backend gets a new `deleteLastStealingForSide` service + DELETE endpoint, plus tighter side-validation in existing `undoLast`. Auto-Switch-Revert pathway is preserved when currentSide+inning is empty (user undoes 3rd-out directly after switch).

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Data JPA, PostgreSQL 17, JUnit + Testcontainers; React 19, TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-05-07-spielbogen-undo-mid-inning-fix-design.md`

---

## Task 1: Stealing-Repo `findLatestForBogenIdAndSide`

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/port/out/SpielbogenStealingRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java`

- [ ] **Step 1: Add port method**

In `backend/src/main/java/com/softball/domain/port/out/SpielbogenStealingRepository.java`, add:
```java
Optional<SpielbogenStealingEvent> findLatestForBogenIdAndSide(Long bogenId, BogenSide side);
```
Place above the existing `countOutsInInning` method.

- [ ] **Step 2: Add JPA query method**

In `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java`, add:
```java
Optional<SpielbogenStealingEventEntity> findFirstByBogen_IdAndSideOrderByIdDesc(Long bogenId, String side);
```
(Add `import java.util.Optional;` if missing.)

- [ ] **Step 3: Implement in adapter**

In `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java`, add method (place between `deleteById` and `countOutsInInning`):
```java
@Override
public Optional<SpielbogenStealingEvent> findLatestForBogenIdAndSide(final Long bogenId, final BogenSide side) {
    return repo.findFirstByBogen_IdAndSideOrderByIdDesc(bogenId, side.name()).map(mapper::toDomain);
}
```

- [ ] **Step 4: Compile-check**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/backend && ./mvnw compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add backend/src/main/java/com/softball/domain/port/out/SpielbogenStealingRepository.java backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java
git commit -m "✨ Spielbogen: Stealing-Repo findLatestForBogenIdAndSide"
```

---

## Task 2: Service `deleteLastStealingForSide` + TDD Test

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java`

- [ ] **Step 1: Write failing test**

In `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java`, add:
```java
@Test
void deleteLastStealingForSide_basic_deletesLatest() {
    Spielbogen bogen = liveBogen(1L);
    SpielbogenStealingEvent ev = new SpielbogenStealingEvent();
    ev.setId(99L);
    ev.setBogen(bogen);
    ev.setSide(BogenSide.HOME);
    ev.setInning(2);
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(Optional.of(ev));

    service.deleteLastStealingForSide(1L, BogenSide.HOME);

    verify(stealingRepo).deleteById(99L);
}

@Test
void deleteLastStealingForSide_noEvent_throws() {
    Spielbogen bogen = liveBogen(1L);
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(Optional.empty());

    assertThrows(BusinessValidationException.class,
        () -> service.deleteLastStealingForSide(1L, BogenSide.HOME));
}
```

- [ ] **Step 2: Run test (compile fail expected)**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest#deleteLastStealingForSide_basic_deletesLatest`
Expected: COMPILE FAIL — `deleteLastStealingForSide` method missing.

- [ ] **Step 3: Implement service method**

In `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`, add (place after `undoLast` method, before `requireLive`):
```java
@Transactional
public void deleteLastStealingForSide(final Long bogenId, final BogenSide side) {
    requireLive(bogenId);
    SpielbogenStealingEvent latest = stealingRepo.findLatestForBogenIdAndSide(bogenId, side)
        .orElseThrow(() -> new BusinessValidationException("Kein Stealing-Event zum Rückgängigmachen für Side " + side));
    stealingRepo.deleteById(latest.getId());
    log.info("Spielbogen {} Stealing-Undo: Event id={} side={} gelöscht", bogenId, latest.getId(), side);
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest`
Expected: ALL GREEN including 2 new tests.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add backend/src/main/java/com/softball/application/SpielbogenScoringService.java backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java
git commit -m "✨ Spielbogen: deleteLastStealingForSide-Service mit Tests"
```

---

## Task 3: Tighten `undoLast` Side-Validation

**Files:**
- Modify: `backend/src/main/java/com/softball/application/SpielbogenScoringService.java`
- Modify: `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java`

- [ ] **Step 1: Write failing test**

Add to `SpielbogenScoringServiceTest.java`:
```java
@Test
void undoLast_wrongSideAndNotPriorAutoSwitch_throws() {
    Spielbogen bogen = liveBogen(1L);
    bogen.setCurrentSide(BogenSide.AWAY);
    bogen.setCurrentInning(3);
    SpielbogenAtBat oldHome = new SpielbogenAtBat();
    oldHome.setId(50L);
    oldHome.setSide(BogenSide.HOME);
    oldHome.setInning(1); // Not currentInning - 1, not currentInning. Different scenario.
    oldHome.setSequence(10L);
    oldHome.setRunsScored(0);
    when(bogenRepo.findById(1L)).thenReturn(Optional.of(bogen));
    when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(oldHome));

    assertThrows(BusinessValidationException.class,
        () -> service.undoLast(1L, BogenSide.HOME));
}
```

- [ ] **Step 2: Run test (should fail - currently no validation)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest#undoLast_wrongSideAndNotPriorAutoSwitch_throws`
Expected: FAIL (no exception thrown — undoLast accepts any side currently).

- [ ] **Step 3: Add validation in undoLast**

In `SpielbogenScoringService.java`, find `undoLast` (around line 190). Insert side-validation BEFORE `atBatRepo.deleteById(last.getId())`:
```java
// Validate side: must be currentSide, OR equal to a prior auto-switch source (last.side != currentSide AND last.inning == currentInning - 1).
if (side != bogen.getCurrentSide()) {
    boolean priorAutoSwitchCandidate = last.getInning() != null
        && bogen.getCurrentInning() != null
        && last.getInning() == bogen.getCurrentInning() - 1;
    if (!priorAutoSwitchCandidate) {
        throw new BusinessValidationException(
            "Undo nur für aktuelle Side oder direkten Auto-Switch-Vorgänger erlaubt"
        );
    }
}
```

Place this directly after the `last` lookup (line ~193) and before `BogenSide undoneSide = last.getSide();`.

- [ ] **Step 4: Run all tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest`
Expected: ALL GREEN. Existing `undoLast` tests must still pass — if any breaks because they passed wrong side previously, fix them to use correct side.

- [ ] **Step 5: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add backend/src/main/java/com/softball/application/SpielbogenScoringService.java backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java
git commit -m "✨ Spielbogen: undoLast Side-Validation"
```

---

## Task 4: Controller DELETE-Endpoint

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`

- [ ] **Step 1: Add endpoint**

In `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java`, add (place near existing undo endpoint at ~line 168):
```java
@DeleteMapping("/{id}/stealing/last")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void deleteLastStealing(@PathVariable Long id, @RequestParam BogenSide side) {
    scoringService.deleteLastStealingForSide(id, side);
}
```

Add import if not present:
```java
// (DeleteMapping should already be imported if existing endpoints use it)
```

- [ ] **Step 2: Compile + test**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java
git commit -m "✨ Spielbogen: DELETE /stealing/last Endpoint"
```

---

## Task 5: Frontend API + Hook

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useSpielbogenScoring.ts`

- [ ] **Step 1: API client function**

In `frontend/src/api/client.ts`, add (place near `undoLastSpielbogenAtBat`):
```ts
export async function deleteLastSpielbogenStealing(bogenId: number, side: BogenSide): Promise<void> {
  await request<void>(`/spielbogen/${bogenId}/stealing/last?side=${side}`, { method: 'DELETE' })
}
```
Skip duplicate imports. `BogenSide` should already be in scope.

- [ ] **Step 2: Hook function**

In `frontend/src/hooks/useSpielbogenScoring.ts`, add inside the hook body (place near `undoLast`):
```ts
const undoLastStealing = useCallback(async (side: BogenSide) => {
  await api.deleteLastSpielbogenStealing(bogenId, side)
  await reload()
}, [bogenId, reload])
```

Add `undoLastStealing` to the hook's return object.

- [ ] **Step 3: Build verify**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/frontend && npm run build`
Expected: TypeScript clean, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add frontend/src/api/client.ts frontend/src/hooks/useSpielbogenScoring.ts
git commit -m "✨ Spielbogen: deleteLastSpielbogenStealing API + Hook"
```

---

## Task 6: SpielbogenPage `latestAction` Logic + handleUndo

**Files:**
- Modify: `frontend/src/components/spielbogen/SpielbogenPage.tsx`

- [ ] **Step 1: Replace lastAtBat-only logic with latestAction**

Open `frontend/src/components/spielbogen/SpielbogenPage.tsx`. Find the existing `lastAtBat` block (around line 251):
```ts
const lastAtBat = allAtBats.length > 0
  ? allAtBats.reduce((a, b) => a.sequence > b.sequence ? a : b)
  : null
```

Below it, add the `latestAction` computation (use existing `currentSide` and `meta.currentInning` already in scope):
```ts
// Latest action on current side + inning (for Undo dispatch). AB or Stealing.
const currentInningAtBats = atBats.filter(ab => ab.side === currentSide && ab.inning === meta.currentInning)
const currentInningStealings = sheet.stealingEvents.filter(s => s.side === currentSide && s.inning === meta.currentInning)
const latestCurrentAB = currentInningAtBats.length > 0
  ? currentInningAtBats.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
  : null
const latestCurrentStealing = currentInningStealings.length > 0
  ? currentInningStealings.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
  : null
const latestAction: { type: 'AB' | 'STEALING' | 'AB_PREVIOUS'; side: BogenSide } | null = (() => {
  if (latestCurrentAB && latestCurrentStealing) {
    return new Date(latestCurrentAB.createdAt) > new Date(latestCurrentStealing.createdAt)
      ? { type: 'AB', side: currentSide }
      : { type: 'STEALING', side: currentSide }
  }
  if (latestCurrentAB) return { type: 'AB', side: currentSide }
  if (latestCurrentStealing) return { type: 'STEALING', side: currentSide }
  // Fallback: undo prior side's last AB (auto-switch revert path)
  if (lastAtBat) return { type: 'AB_PREVIOUS', side: lastAtBat.side }
  return null
})()
```

- [ ] **Step 2: Add handleUndo handler**

Add a handler near other handlers (e.g., near `handleSubstitutionSubmit`):
```ts
const handleUndo = async () => {
  if (!latestAction) return
  if (latestAction.type === 'STEALING') {
    await undoLastStealing(latestAction.side)
  } else {
    await undoLast(latestAction.side)
  }
}
```

Destructure `undoLastStealing` from `useSpielbogenScoring()` (next to `undoLast`).

- [ ] **Step 3: Update LastAtBatPreview prop**

Find the `<LastAtBatPreview ... />` usage. Change from:
```tsx
onUndo={undoLast}
```
to:
```tsx
onUndo={handleUndo}
disabled={!latestAction}
```

- [ ] **Step 4: Build + lint verify**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/frontend && npm run build`
Expected: TypeScript fail with "Property 'disabled' does not exist on type 'Props'" (because LastAtBatPreview Props doesn't have it yet). Wait for Task 7.

- [ ] **Step 5: (Skip commit until Task 7)**

This task pairs with Task 7 — commit together.

---

## Task 7: LastAtBatPreview signature update

**Files:**
- Modify: `frontend/src/components/spielbogen/LastAtBatPreview.tsx`

- [ ] **Step 1: Update Props type**

In `frontend/src/components/spielbogen/LastAtBatPreview.tsx`, change Props type at line 6-12:
```ts
interface Props {
  lastAtBat: SpielbogenAtBatResponse | null
  slots: SpielbogenSlotResponse[]
  onUndo: () => Promise<void>
  onCorrect?: () => void
  submitting?: boolean
  disabled?: boolean
}
```

- [ ] **Step 2: Update handleUndo to drop side arg**

Change line 81-88 from:
```ts
const handleUndo = async () => {
  setUndoing(true)
  try {
    await onUndo(lastAtBat.side)
  } finally {
    setUndoing(false)
  }
}
```
to:
```ts
const handleUndo = async () => {
  setUndoing(true)
  try {
    await onUndo()
  } finally {
    setUndoing(false)
  }
}
```

- [ ] **Step 3: Update component signature destructure**

Change line 59:
```tsx
export function LastAtBatPreview({ lastAtBat, slots, onUndo, onCorrect, submitting, disabled }: Props) {
```

- [ ] **Step 4: Wire `disabled` into Undo-Button**

Find the Undo-Button (around line 104). Update:
```tsx
<button
  onClick={handleUndo}
  disabled={undoing || submitting || disabled}
  className="shrink-0 font-display text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-navy-700 text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer disabled:opacity-50"
>
  {undoing ? '…' : 'Undo'}
</button>
```

- [ ] **Step 5: Build + lint verify**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/frontend && npm run build && npm run lint`
Expected: build success; lint shows only pre-existing warnings.

- [ ] **Step 6: Commit (combined Task 6 + 7)**

```bash
cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix
git add frontend/src/components/spielbogen/SpielbogenPage.tsx frontend/src/components/spielbogen/LastAtBatPreview.tsx
git commit -m "🐛 Spielbogen: Undo dispatcht auf currentSide/inning (AB oder Stealing)"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Backend full test**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: ALL TESTS PASS.

- [ ] **Step 2: Frontend full build + lint**

Run: `cd /home/hungl/privat/softball-lineup/.claude/worktrees/spielbogen-undo-fix/frontend && npm run build && npm run lint`
Expected: build success, lint shows only pre-existing warnings.

- [ ] **Step 3: Manual E2E**

Start dev environment:
```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
# in another terminal:
cd frontend && npx vite
```

Test scenario:
1. Spielbogen LIVE öffnen, beide Sides Lineup haben.
2. AWAY-Side: Records 3 Outs accumulieren → Auto-Switch zu HOME.
3. HOME-Side: Tap MEHR → Stealing → CS recordieren. Out-Counter zeigt 1, kein AB.
4. Klick **Undo**: erwartet → Stealing-Event gelöscht (kein Side-Switch). Out-Counter geht auf 0.
5. Erneut Klick **Undo** mit leerer HOME-Inning: erwartet → AWAY's 3rd-Out wird undone, side reverted zu AWAY.
6. Auf AWAY: AB recorden (z.B. 1B), dann Klick **Undo**: erwartet → AB gelöscht, gleicher Side+Inning bleibt.

- [ ] **Step 4: Commit any final fixes from manual E2E**

If any issues found in manual E2E, fix and commit. Otherwise nothing to commit.

---

## Self-Review Notes

Spec coverage:
- Frontend `latestAction` logic — Task 6 ✓
- AB-undo-dispatch + Stealing-undo-dispatch + AB_PREVIOUS-fallback — Task 6 ✓
- LastAtBatPreview signature change (no side arg) + disabled prop — Task 7 ✓
- Backend `deleteLastStealingForSide` service + tests — Task 2 ✓
- Repo `findLatestForBogenIdAndSide` — Task 1 ✓
- Controller DELETE endpoint — Task 4 ✓
- `undoLast` side-validation — Task 3 ✓
- Auto-Switch-Revert preserved (AB_PREVIOUS fallback in Task 6) ✓
- Manual E2E — Task 8 ✓

Type consistency:
- `latestAction` shape matches what `handleUndo` consumes ✓
- `undoLastStealing` and `undoLast` both take `side: BogenSide` ✓
- LastAtBatPreview's `onUndo` is `() => Promise<void>` (no side arg) ✓

Out-of-scope (multi-step undo, undo-after-correction, stealing-3rd-out auto-revert) explicitly NOT included in any task — confirmed.
