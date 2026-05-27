# Trainingsplan Anfänger-Gruppe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional second parallel "Anfänger" group to training plans. Toggle on generator-form, beginner-block gets basic-only drills + 1.5x duration. Manual drill-swap per section.

**Architecture:** 1 Plan pro Training, each Section bekommt `group: ALL | MAIN | BEGINNER` Feld. Shared phases (Warmup/Partner-Routine/Batting/Game) bleiben ALL. Bei aktivierter Anfänger-Toggle wird Skill-Phase in 2 parallele Section-Blocks gesplittet. Storage in bestehendem JSONB-Content (keine DB-Migration).

**Tech Stack:** Spring Boot + Java 21 (Backend), React 19 + Vite + TypeScript + Tailwind v4 (Frontend), Vitest + Playwright (Tests).

**Spec:** `docs/superpowers/specs/2026-05-27-trainingsplan-anfaenger-gruppe-design.md`

---

## File Structure

**Backend:**
- Create: `backend/src/main/java/com/softball/domain/model/SectionGroup.java` — Enum (ALL, MAIN, BEGINNER)
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java` — add `group: SectionGroup` field
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlanRequest.java` — add `withBeginnerGroup`, `beginnerCount`
- Modify: `backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java` — branch for dual-group
- Modify: `backend/src/main/java/com/softball/application/TrainingPlanService.java` — accept new fields + add `updateSectionDrill`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java` — PATCH `/sections/{index}` endpoint
- Modify: `backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java` — add new fields
- Modify: `backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java` — add `group` field
- Create: `backend/src/main/java/com/softball/adapter/dto/PatchSectionDrillRequest.java` — `{ drillId }`
- Modify: `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java` — new tests
- Create: `backend/src/test/java/com/softball/application/TrainingPlanServiceUpdateSectionDrillTest.java`

**Frontend:**
- Modify: `frontend/src/types/index.ts` — add `SectionGroup` type, fields
- Modify: `frontend/src/api/client.ts` — `patchPlanSection` function
- Modify: `frontend/src/components/training/GeneratePlanDrawer.tsx` — checkbox + count input
- Modify: `frontend/src/components/training/TrainingPlanView.tsx` — group-aware render
- Modify: `frontend/src/components/training/PlanEditDrawer.tsx` — group badges + pencil-swap
- Modify: `frontend/src/components/training/DrillPickerModal.tsx` — `complexityFilter` prop
- Create: `frontend/e2e/training/plan-generate-dual-group.spec.ts`
- Create: `frontend/e2e/training/plan-edit-swap-drill.spec.ts`

---

## Task 1: Backend Domain — SectionGroup Enum + Fields

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/SectionGroup.java`
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java`
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlanRequest.java`

- [ ] **Step 1: Create SectionGroup enum**

```java
// backend/src/main/java/com/softball/domain/model/SectionGroup.java
package com.softball.domain.model;

/**
 * Diskriminator für Sections wenn parallele Anfänger-Gruppe aktiviert ist.
 * - ALL: Section gilt für beide Gruppen (Warmup, Partner-Routine, Batting, Game)
 * - MAIN: Section nur für Hauptgruppe (Skill-Stations mit allen Komplexitäten)
 * - BEGINNER: Section nur für Anfänger (Skill-Stations mit complexity=BASIC, ~1.5x länger)
 */
public enum SectionGroup {
    ALL,
    MAIN,
    BEGINNER
}
```

- [ ] **Step 2: Add `group` field to TrainingPlanSection**

Modify `TrainingPlanSection.java`. After existing fields (`playersPerGroup`), add:

```java
    private SectionGroup group = SectionGroup.ALL;

    // ... existing getters/setters ...

    public SectionGroup getGroup() { return group != null ? group : SectionGroup.ALL; }
    public void setGroup(final SectionGroup group) { this.group = group; }
```

Note: Default `ALL` ensures backward-compat — existing plans without group field deserialize as null but getter returns ALL.

- [ ] **Step 3: Add `withBeginnerGroup` + `beginnerCount` to TrainingPlanRequest**

Modify `TrainingPlanRequest.java`. Add fields after `availableDrills`:

```java
    private boolean withBeginnerGroup;
    private int beginnerCount;

    // ... existing getters/setters ...

    public boolean isWithBeginnerGroup() { return withBeginnerGroup; }
    public void setWithBeginnerGroup(final boolean withBeginnerGroup) { this.withBeginnerGroup = withBeginnerGroup; }
    public int getBeginnerCount() { return beginnerCount; }
    public void setBeginnerCount(final int beginnerCount) { this.beginnerCount = beginnerCount; }
```

- [ ] **Step 4: Verify backward-compat by running existing tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorTest`
Expected: All existing tests PASS (no behavior changes, just new fields with defaults).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/SectionGroup.java \
        backend/src/main/java/com/softball/domain/model/TrainingPlanSection.java \
        backend/src/main/java/com/softball/domain/model/TrainingPlanRequest.java
git commit -m "✨ Domain: SectionGroup enum + group/beginner-Felder

Backward-compat: getGroup() returnt default ALL für deserialisierte Sections
ohne group-Feld. Noch keine Generator-Logik-Änderung."
```

---

## Task 2: Backend Generator — dualGroup Branch (TDD)

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java`
- Modify: `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java`

- [ ] **Step 1: Write test `singleGroup_unchanged` (regression guard)**

Add to `TrainingPlanGeneratorTest.java`:

```java
    @Test
    void singleGroup_allSectionsHaveGroupAll() {
        final TrainingPlanRequest req = new TrainingPlanRequest(14, "BATTING_PITCHING", 120, allTestDrills());
        req.setWithBeginnerGroup(false);

        final TrainingPlan plan = generator.generate(1L, req);

        assertThat(plan.getContent().getSections())
            .allSatisfy(s -> assertThat(s.getGroup()).isEqualTo(SectionGroup.ALL));
    }
```

- [ ] **Step 2: Run test — verify it fails or passes (depending on default)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#singleGroup_allSectionsHaveGroupAll'`
Expected: PASS (Section default ist ALL — no implementation needed yet, this is the baseline)

- [ ] **Step 3: Write failing test `dualGroup_skillSectionsHaveGroupMainAndBeginner`**

```java
    @Test
    void dualGroup_skillSectionsHaveGroupMainAndBeginner() {
        final TrainingPlanRequest req = new TrainingPlanRequest(12, "BATTING_PITCHING", 120, allTestDrills());
        req.setWithBeginnerGroup(true);
        req.setBeginnerCount(4);

        final TrainingPlan plan = generator.generate(1L, req);
        final List<TrainingPlanSection> sections = plan.getContent().getSections();

        // Warmup/Partner/Batting/Game bleiben ALL
        assertThat(sections.stream().filter(s -> s.getSectionType().equals("WARMUP")))
            .allSatisfy(s -> assertThat(s.getGroup()).isEqualTo(SectionGroup.ALL));
        assertThat(sections.stream().filter(s -> s.getSectionType().equals("BATTING")))
            .allSatisfy(s -> assertThat(s.getGroup()).isEqualTo(SectionGroup.ALL));

        // Mindestens 1 MAIN + 1 BEGINNER Section vorhanden
        assertThat(sections).anyMatch(s -> s.getGroup() == SectionGroup.MAIN);
        assertThat(sections).anyMatch(s -> s.getGroup() == SectionGroup.BEGINNER);
    }
```

- [ ] **Step 4: Run test — verify it FAILS**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_skillSectionsHaveGroupMainAndBeginner'`
Expected: FAIL — generator ignores `withBeginnerGroup`, no BEGINNER sections produced.

- [ ] **Step 5: Implement Generator branch — add group-tagging logic**

In `TrainingPlanGenerator.java`, find the place where station-blocks are built (around line 150-328). Wrap the existing station-building in a branch:

```java
// At top of generate() method, after collecting allDrills:
final boolean withBeginner = req.isWithBeginnerGroup() && req.getBeginnerCount() >= 2;
final int mainPlayers = req.getPlayerCount();
final int beginnerPlayers = withBeginner ? req.getBeginnerCount() : 0;
final int totalPlayers = mainPlayers + beginnerPlayers;

// ... existing warmup + partner-routine code, but pass totalPlayers ...
// All these sections stay group=ALL (default)

// In the skill-stations section (currently single buildStationBlock calls):
if (withBeginner) {
    // Build main-group stations with all drills
    final List<TrainingPlanSection> mainSections = buildStationBlock(stationDrills, mainPlayers, subFocusMinutes, parallelGroupCounter);
    mainSections.forEach(s -> s.setGroup(SectionGroup.MAIN));
    sections.addAll(mainSections);

    // Build beginner stations: only BASIC drills, ~1.5x duration
    final List<Drill> basicDrills = stationDrills.stream()
        .filter(d -> d.getComplexity() == DrillComplexity.BASIC)
        .toList();
    final int beginnerMinutes = subFocusMinutes + Math.max(10, subFocusMinutes / 2);
    final List<TrainingPlanSection> beginnerSections = buildStationBlock(
        basicDrills.isEmpty() ? stationDrills : basicDrills,
        beginnerPlayers, beginnerMinutes, parallelGroupCounter);
    beginnerSections.forEach(s -> s.setGroup(SectionGroup.BEGINNER));
    sections.addAll(beginnerSections);
    parallelGroupCounter++;
} else {
    // Existing single-group path
    sections.addAll(buildStationBlock(stationDrills, totalPlayers, subFocusMinutes, parallelGroupCounter));
    parallelGroupCounter++;
}
```

Note: Apply this branching pattern to ALL three station-block call sites (lines ~210, ~236, ~314 — focus, position-stations, sub-focus). They all need the same `if (withBeginner)` treatment.

- [ ] **Step 6: Run test — verify it PASSES**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_skillSectionsHaveGroupMainAndBeginner'`
Expected: PASS.

- [ ] **Step 7: Write test `dualGroup_beginnerSectionsLonger`**

```java
    @Test
    void dualGroup_beginnerSectionsLonger() {
        final TrainingPlanRequest req = new TrainingPlanRequest(12, "BATTING_PITCHING", 120, allTestDrills());
        req.setWithBeginnerGroup(true);
        req.setBeginnerCount(4);

        final TrainingPlan plan = generator.generate(1L, req);

        final int mainTotal = plan.getContent().getSections().stream()
            .filter(s -> s.getGroup() == SectionGroup.MAIN)
            .mapToInt(s -> s.getDurationMinutes() != null ? s.getDurationMinutes() : 0)
            .sum();
        final int beginnerTotal = plan.getContent().getSections().stream()
            .filter(s -> s.getGroup() == SectionGroup.BEGINNER)
            .mapToInt(s -> s.getDurationMinutes() != null ? s.getDurationMinutes() : 0)
            .sum();

        assertThat(beginnerTotal).isGreaterThan(mainTotal);
    }
```

- [ ] **Step 8: Run test — verify it PASSES**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_beginnerSectionsLonger'`
Expected: PASS (formula `+max(10, half)` ensures longer).

- [ ] **Step 9: Write test `dualGroup_beginnerOnlyBasicDrills`**

```java
    @Test
    void dualGroup_beginnerOnlyBasicDrills() {
        // Mix: 3 BASIC + 3 ADVANCED hitting drills
        final List<Drill> drills = new ArrayList<>();
        for (int i = 0; i < 3; i++) drills.add(testDrill("basic-" + i, DrillComplexity.BASIC, "HITTING"));
        for (int i = 0; i < 3; i++) drills.add(testDrill("adv-" + i, DrillComplexity.ADVANCED, "HITTING"));

        final TrainingPlanRequest req = new TrainingPlanRequest(12, "BATTING_PITCHING", 120, drills);
        req.setWithBeginnerGroup(true);
        req.setBeginnerCount(4);

        final TrainingPlan plan = generator.generate(1L, req);

        // Alle BEGINNER-Sections müssen BASIC-Drills nutzen
        for (final TrainingPlanSection s : plan.getContent().getSections()) {
            if (s.getGroup() == SectionGroup.BEGINNER && s.getDrillId() != null) {
                final Drill used = drills.stream().filter(d -> d.getId().equals(s.getDrillId())).findFirst().orElseThrow();
                assertThat(used.getComplexity()).isEqualTo(DrillComplexity.BASIC);
            }
        }
    }
```

- [ ] **Step 10: Run test — verify PASSES**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_beginnerOnlyBasicDrills'`
Expected: PASS.

- [ ] **Step 11: Write test `dualGroup_tooFewBeginners_noSplit`**

```java
    @Test
    void dualGroup_tooFewBeginners_noSplit() {
        final TrainingPlanRequest req = new TrainingPlanRequest(12, "BATTING_PITCHING", 120, allTestDrills());
        req.setWithBeginnerGroup(true);
        req.setBeginnerCount(1); // < 2, soll Split deaktivieren

        final TrainingPlan plan = generator.generate(1L, req);

        // Keine BEGINNER-Sections, alles ALL
        assertThat(plan.getContent().getSections())
            .noneMatch(s -> s.getGroup() == SectionGroup.BEGINNER);
        assertThat(plan.getContent().getSections())
            .noneMatch(s -> s.getGroup() == SectionGroup.MAIN);
        // Hint im Content
        assertThat(plan.getContent().getGroupDistributionHint())
            .containsIgnoringCase("zu wenig");
    }
```

- [ ] **Step 12: Implement the `< 2` guard + hint**

In `TrainingPlanGenerator.java`, after computing `withBeginner`:

```java
String beginnerHint = null;
if (req.isWithBeginnerGroup() && req.getBeginnerCount() < 2) {
    beginnerHint = "Zu wenig Anfänger (< 2) für eigenen Block — alle trainieren mit Hauptgruppe";
}
```

And when building `TrainingPlanContent`, prepend the hint if non-null:

```java
final String finalHint = beginnerHint != null
    ? beginnerHint + (existingHint != null ? " · " + existingHint : "")
    : existingHint;
content.setGroupDistributionHint(finalHint);
```

- [ ] **Step 13: Run test — verify PASSES**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_tooFewBeginners_noSplit'`
Expected: PASS.

- [ ] **Step 14: Write test `dualGroup_noBasicDrills_fallback`**

```java
    @Test
    void dualGroup_noBasicDrills_fallback() {
        // Pool: nur ADVANCED hitting drills
        final List<Drill> drills = new ArrayList<>();
        for (int i = 0; i < 5; i++) drills.add(testDrill("adv-" + i, DrillComplexity.ADVANCED, "HITTING"));

        final TrainingPlanRequest req = new TrainingPlanRequest(12, "BATTING_PITCHING", 120, drills);
        req.setWithBeginnerGroup(true);
        req.setBeginnerCount(4);

        final TrainingPlan plan = generator.generate(1L, req);

        // BEGINNER-Sections existieren trotzdem (Fallback nutzt available drills)
        assertThat(plan.getContent().getSections())
            .anyMatch(s -> s.getGroup() == SectionGroup.BEGINNER && s.getDrillId() != null);
        // Hint warnt
        assertThat(plan.getContent().getGroupDistributionHint())
            .containsIgnoringCase("keine basic");
    }
```

- [ ] **Step 15: Implement fallback warning**

In the dualGroup branch, after filtering basicDrills:

```java
if (basicDrills.isEmpty() && !stationDrills.isEmpty()) {
    beginnerHint = (beginnerHint != null ? beginnerHint + " · " : "")
        + "Keine BASIC-Drills im Pool — Anfänger-Block nutzt fortgeschrittene Drills";
}
```

- [ ] **Step 16: Run test — verify PASSES**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest#dualGroup_noBasicDrills_fallback'`
Expected: PASS.

- [ ] **Step 17: Run full GeneratorTest suite to ensure no regressions**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanGeneratorTest'`
Expected: All tests PASS.

- [ ] **Step 18: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java \
        backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java
git commit -m "✨ Generator: dualGroup Skill-Phase-Split (Main + Beginner-BASIC)

- withBeginnerGroup=true + beginnerCount>=2: Skill-Stations werden in 2 parallele
  Section-Blocks gesplittet (MAIN: alle complexities, BEGINNER: nur BASIC, ~1.5x länger)
- beginnerCount<2: Fallback auf single-group + Warning-Hint
- Keine BASIC-Drills: Fallback auf alle + Warning-Hint
- Shared phases (Warmup/Partner/Batting/Game) bleiben group=ALL
- 5 neue Tests"
```

---

## Task 3: API — GenerateRequest DTO + Service-Signature

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java`
- Modify: `backend/src/main/java/com/softball/application/TrainingPlanService.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java`

- [ ] **Step 1: Extend GeneratePlanRequest DTO**

Modify `GeneratePlanRequest.java`:

```java
public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes,
        List<InfieldPosition> infieldPositions,
        Boolean withBeginnerGroup,
        Integer beginnerCount
) {
    public List<InfieldPosition> infieldPositionsOrEmpty() {
        return infieldPositions != null ? infieldPositions : List.of();
    }

    public boolean withBeginnerGroupOrFalse() {
        return Boolean.TRUE.equals(withBeginnerGroup);
    }

    public int beginnerCountOrZero() {
        return beginnerCount != null ? beginnerCount : 0;
    }
}
```

- [ ] **Step 2: Add group to TrainingPlanSectionResponse**

Modify `TrainingPlanSectionResponse.java`:

```java
public record TrainingPlanSectionResponse(
        String drillId, String sectionType, String title, Integer durationMinutes,
        Integer rounds, String adaptationNotes, String rotationPlan, String setupNotes,
        String tips, String groupSetup, String userNotes,
        Integer parallelGroup, Integer playersPerGroup,
        SectionGroup group) {

    public static TrainingPlanSectionResponse from(final TrainingPlanSection section) {
        return new TrainingPlanSectionResponse(
                section.getDrillId(), section.getSectionType(), section.getTitle(),
                section.getDurationMinutes(), section.getRounds(), section.getAdaptationNotes(),
                section.getRotationPlan(), section.getSetupNotes(), section.getTips(),
                section.getGroupSetup(), section.getUserNotes(),
                section.getParallelGroup(), section.getPlayersPerGroup(),
                section.getGroup());
    }

    public TrainingPlanSection toDomain() {
        final TrainingPlanSection section = new TrainingPlanSection();
        section.setDrillId(drillId);
        section.setSectionType(sectionType);
        section.setTitle(title);
        section.setDurationMinutes(durationMinutes);
        section.setRounds(rounds);
        section.setAdaptationNotes(adaptationNotes);
        section.setRotationPlan(rotationPlan);
        section.setSetupNotes(setupNotes);
        section.setTips(tips);
        section.setGroupSetup(groupSetup);
        section.setUserNotes(userNotes);
        section.setParallelGroup(parallelGroup);
        section.setPlayersPerGroup(playersPerGroup);
        section.setGroup(group != null ? group : SectionGroup.ALL);
        return section;
    }
}
```

Add import: `import com.softball.domain.model.SectionGroup;`

- [ ] **Step 3: Update TrainingPlanService.generate signature**

In `TrainingPlanService.java`, find the `generate` method. Add parameters and pass to request:

```java
public TrainingPlanResponse generate(
        final Long trainingId,
        final int playerCount,
        final String focus,
        final int durationMinutes,
        final List<InfieldPosition> infieldPositions,
        final boolean withBeginnerGroup,
        final int beginnerCount) {

    // ... existing logic to fetch drills, build request ...
    final TrainingPlanRequest req = new TrainingPlanRequest(playerCount, focus, durationMinutes, drills);
    req.setWithBeginnerGroup(withBeginnerGroup);
    req.setBeginnerCount(beginnerCount);
    // ... rest of logic
}
```

- [ ] **Step 4: Update Controller to pass new fields**

In `TrainingPlanController.java`:

```java
@PostMapping("/generate")
@ResponseStatus(HttpStatus.CREATED)
public TrainingPlanResponse generate(@Valid @RequestBody final GeneratePlanRequest request) {
    return trainingPlanService.generate(
            request.trainingId(), request.playerCount(),
            request.focus(), request.durationMinutes(),
            request.infieldPositionsOrEmpty(),
            request.withBeginnerGroupOrFalse(),
            request.beginnerCountOrZero());
}
```

- [ ] **Step 5: Run all backend tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: All PASS (existing tests didn't pass new fields → default false/0 → backward-compat).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java \
        backend/src/main/java/com/softball/adapter/dto/TrainingPlanSectionResponse.java \
        backend/src/main/java/com/softball/application/TrainingPlanService.java \
        backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java
git commit -m "✨ API: withBeginnerGroup + beginnerCount in GenerateRequest, group in SectionResponse"
```

---

## Task 4: Backend — Manual Drill Swap Endpoint (TDD)

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/PatchSectionDrillRequest.java`
- Modify: `backend/src/main/java/com/softball/application/TrainingPlanService.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java`
- Create: `backend/src/test/java/com/softball/application/TrainingPlanServiceUpdateSectionDrillTest.java`

- [ ] **Step 1: Create PatchSectionDrillRequest DTO**

```java
// backend/src/main/java/com/softball/adapter/dto/PatchSectionDrillRequest.java
package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record PatchSectionDrillRequest(@NotBlank String drillId) {
}
```

- [ ] **Step 2: Write failing service test**

Create `TrainingPlanServiceUpdateSectionDrillTest.java`:

```java
package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.DrillRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TrainingPlanServiceUpdateSectionDrillTest {

    @Mock private TrainingPlanRepository planRepository;
    @Mock private DrillRepository drillRepository;
    // ... other mocks needed by TrainingPlanService constructor — fill in based on actual signature

    @InjectMocks
    private TrainingPlanService service;

    @Test
    void updateSectionDrill_replacesDrillMetaKeepsUserEdits() {
        // Arrange: Plan mit 3 Sections, Section[1] hat drillId="OLD"
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new java.util.ArrayList<>();
        sections.add(makeSection("WARMUP", "OLD-WARMUP", SectionGroup.ALL, 30));
        final TrainingPlanSection target = makeSection("DRILL", "OLD", SectionGroup.BEGINNER, 25);
        target.setUserNotes("User-Notiz behalten");
        target.setRounds(3);
        sections.add(target);
        sections.add(makeSection("BATTING", "OLD-BAT", SectionGroup.ALL, 45));

        final TrainingPlanContent content = new TrainingPlanContent(sections, null, null);
        plan.setContent(content);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(planRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Neuer Drill
        final Drill newDrill = new Drill();
        newDrill.setId("NEW");
        newDrill.setName("Neuer Drill");
        newDrill.setRotation("Neue Rotation");
        when(drillRepository.findById("NEW")).thenReturn(Optional.of(newDrill));

        // Act
        service.updateSectionDrill(1L, 1, "NEW");

        // Assert: target Section hat neue Drill-Meta, aber userNotes + rounds + duration + group bleiben
        final TrainingPlanSection updated = plan.getContent().getSections().get(1);
        assertThat(updated.getDrillId()).isEqualTo("NEW");
        assertThat(updated.getTitle()).isEqualTo("Neuer Drill");
        assertThat(updated.getRotationPlan()).isEqualTo("Neue Rotation");
        // Bleibt unverändert:
        assertThat(updated.getUserNotes()).isEqualTo("User-Notiz behalten");
        assertThat(updated.getRounds()).isEqualTo(3);
        assertThat(updated.getDurationMinutes()).isEqualTo(25);
        assertThat(updated.getGroup()).isEqualTo(SectionGroup.BEGINNER);
        assertThat(updated.getSectionType()).isEqualTo("DRILL");
    }

    @Test
    void updateSectionDrill_planNotFound_throws404() {
        when(planRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSectionDrill(99L, 0, "ANY"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateSectionDrill_indexOutOfRange_throws400() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        plan.setContent(new TrainingPlanContent(List.of(makeSection("WARMUP", "X", SectionGroup.ALL, 30)), null, null));
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.updateSectionDrill(1L, 5, "NEW"))
            .isInstanceOf(BusinessValidationException.class);
    }

    @Test
    void updateSectionDrill_drillNotFound_throws404() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        plan.setContent(new TrainingPlanContent(List.of(makeSection("DRILL", "X", SectionGroup.MAIN, 20)), null, null));
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(drillRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSectionDrill(1L, 0, "UNKNOWN"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private TrainingPlanSection makeSection(final String type, final String drillId, final SectionGroup group, final int duration) {
        final TrainingPlanSection s = new TrainingPlanSection();
        s.setSectionType(type);
        s.setDrillId(drillId);
        s.setTitle(drillId);
        s.setGroup(group);
        s.setDurationMinutes(duration);
        return s;
    }
}
```

Note: Adjust constructor mocks based on actual `TrainingPlanService` constructor signature (check existing tests for the pattern).

- [ ] **Step 3: Run test — verify FAILS (method missing)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanServiceUpdateSectionDrillTest'`
Expected: Compilation error or test failure — `updateSectionDrill` method doesn't exist.

- [ ] **Step 4: Implement service method**

In `TrainingPlanService.java`, add:

```java
@Transactional
public TrainingPlanResponse updateSectionDrill(final Long planId, final int sectionIndex, final String drillId) {
    final TrainingPlan plan = planRepository.findById(planId)
        .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));

    final List<TrainingPlanSection> sections = plan.getContent().getSections();
    if (sectionIndex < 0 || sectionIndex >= sections.size()) {
        throw new BusinessValidationException("Section-Index " + sectionIndex + " außerhalb des Range (0.." + (sections.size() - 1) + ")");
    }

    final Drill newDrill = drillRepository.findById(drillId)
        .orElseThrow(() -> new ResourceNotFoundException("Drill", drillId));

    final TrainingPlanSection target = sections.get(sectionIndex);
    // Drill-Meta überschreiben
    target.setDrillId(newDrill.getId());
    target.setTitle(newDrill.getName());
    target.setRotationPlan(newDrill.getRotation());
    // setupNotes + tips falls vorhanden auf Drill, sonst null (Drill-spezifisch)
    // (Drill-Model selbst hat möglicherweise keine setupNotes/tips — die kommen aus Generator-Logik;
    //  bei Swap setzen wir sie auf null da kein Drill-Override)
    target.setSetupNotes(null);
    target.setTips(null);

    log.info("Section {} in Plan {} drillId getauscht: {} → {}", sectionIndex, planId, target.getDrillId(), drillId);
    return TrainingPlanResponse.from(planRepository.save(plan));
}
```

Add imports as needed: `org.springframework.transaction.annotation.Transactional`, `BusinessValidationException`, etc.

- [ ] **Step 5: Run tests — verify PASS**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest='TrainingPlanServiceUpdateSectionDrillTest'`
Expected: All 4 tests PASS.

- [ ] **Step 6: Add PATCH endpoint in Controller**

In `TrainingPlanController.java`:

```java
@PatchMapping("/{id}/sections/{index}")
public TrainingPlanResponse updateSectionDrill(
        @PathVariable final Long id,
        @PathVariable final int index,
        @Valid @RequestBody final PatchSectionDrillRequest request) {
    return trainingPlanService.updateSectionDrill(id, index, request.drillId());
}
```

- [ ] **Step 7: Run all backend tests**

Run: `./mvnw test -s .mvn/local-settings.xml`
Expected: All PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/PatchSectionDrillRequest.java \
        backend/src/main/java/com/softball/application/TrainingPlanService.java \
        backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java \
        backend/src/test/java/com/softball/application/TrainingPlanServiceUpdateSectionDrillTest.java
git commit -m "✨ Manual Drill-Swap: PATCH /training-plans/{id}/sections/{index}

Ersetzt drillId + title + rotation + setupNotes/tips. Behält durationMinutes,
rounds, group, userNotes, parallelGroup, playersPerGroup. 4 Unit-Tests."
```

---

## Task 5: Frontend — Types + API Client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add SectionGroup type + extend interfaces**

In `frontend/src/types/index.ts`, find `TrainingPlanSectionResponse` interface (or similar). Add:

```typescript
export type SectionGroup = 'ALL' | 'MAIN' | 'BEGINNER'

// In TrainingPlanSectionResponse:
export interface TrainingPlanSectionResponse {
  // ... existing fields
  group?: SectionGroup  // optional for backward-compat with old plans
}

// In GeneratePlanRequest (or similar):
export interface GeneratePlanRequest {
  // ... existing fields
  withBeginnerGroup?: boolean
  beginnerCount?: number
}
```

- [ ] **Step 2: Add patchPlanSection API function**

In `frontend/src/api/client.ts`, find training-plan endpoints. Add:

```typescript
export const patchPlanSection = (planId: number, sectionIndex: number, drillId: string) =>
  request<TrainingPlanResponse>(`/training-plans/${planId}/sections/${sectionIndex}`, {
    method: 'PATCH',
    body: JSON.stringify({ drillId }),
  })
```

- [ ] **Step 3: Run TypeScript build to verify types compile**

Run: `cd frontend && npm run build`
Expected: Build SUCCESS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "✨ Frontend Types: SectionGroup + patchPlanSection API"
```

---

## Task 6: Frontend — GeneratePlanDrawer Checkbox + Count

**Files:**
- Modify: `frontend/src/components/training/GeneratePlanDrawer.tsx`

- [ ] **Step 1: Add state for withBeginnerGroup + beginnerCount**

In `GeneratePlanDrawer.tsx`, find state declarations (useState calls). Add:

```typescript
const [withBeginnerGroup, setWithBeginnerGroup] = useState(false)
const [beginnerCount, setBeginnerCount] = useState(2)
```

- [ ] **Step 2: Add UI elements in form (after playerCount, before focus)**

Find the JSX where `playerCount` input lives. Add below it:

```tsx
<div className="space-y-2">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={withBeginnerGroup}
      onChange={(e) => setWithBeginnerGroup(e.target.checked)}
      className="w-4 h-4 cursor-pointer"
    />
    <span className="text-sm font-medium text-navy-900">Mit Anfängergruppe?</span>
  </label>
  {withBeginnerGroup && (
    <div className="pl-6">
      <label className="block text-xs text-gray-600 mb-1">Anfänger-Anzahl (min 2)</label>
      <input
        type="number"
        min={2}
        value={beginnerCount}
        onChange={(e) => setBeginnerCount(Math.max(2, parseInt(e.target.value) || 2))}
        className="w-24 border border-cream-300 rounded-lg px-3 py-2 text-sm focus:border-navy-600 outline-none"
      />
    </div>
  )}
</div>
```

- [ ] **Step 3: Pass new fields to generate API call**

Find the `handleGenerate` (or onClick of generate-button) function. Update the request body:

```typescript
const response = await api.generatePlan({
  trainingId,
  playerCount,
  focus,
  durationMinutes,
  infieldPositions,
  withBeginnerGroup,
  beginnerCount: withBeginnerGroup ? beginnerCount : 0,
})
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 5: Smoke-test in dev**

Run dev server (already running) → navigate to Training-Tagesplan → click "Generate Plan" → Drawer öffnet → Checkbox sichtbar → toggle zeigt Count-Input.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/training/GeneratePlanDrawer.tsx
git commit -m "✨ GeneratePlanDrawer: Checkbox 'Mit Anfängergruppe?' + Count-Input"
```

---

## Task 7: Frontend — TrainingPlanView Group-Aware Render

**Files:**
- Modify: `frontend/src/components/training/TrainingPlanView.tsx`

- [ ] **Step 1: Add helper to group consecutive MAIN+BEGINNER sections**

At top of `TrainingPlanView.tsx`, add helper function:

```typescript
type SectionRenderItem =
  | { kind: 'single'; section: TrainingPlanSectionResponse; index: number }
  | { kind: 'parallel'; main: TrainingPlanSectionResponse[]; beginner: TrainingPlanSectionResponse[]; startIndex: number }

function groupSectionsForRender(sections: TrainingPlanSectionResponse[]): SectionRenderItem[] {
  const result: SectionRenderItem[] = []
  let i = 0
  while (i < sections.length) {
    const s = sections[i]
    const group = s.group ?? 'ALL'
    if (group === 'MAIN' || group === 'BEGINNER') {
      const mainBatch: TrainingPlanSectionResponse[] = []
      const beginnerBatch: TrainingPlanSectionResponse[] = []
      const startIndex = i
      while (i < sections.length && (sections[i].group === 'MAIN' || sections[i].group === 'BEGINNER')) {
        if (sections[i].group === 'MAIN') mainBatch.push(sections[i])
        else beginnerBatch.push(sections[i])
        i++
      }
      result.push({ kind: 'parallel', main: mainBatch, beginner: beginnerBatch, startIndex })
    } else {
      result.push({ kind: 'single', section: s, index: i })
      i++
    }
  }
  return result
}
```

- [ ] **Step 2: Render `parallel` items as 2-column grid (desktop) / stacked (mobile)**

In the main render, replace the linear `.map(section => <SectionCard ... />)` with:

```tsx
const items = groupSectionsForRender(plan.content.sections)

return (
  <div className="space-y-3">
    {items.map((item, idx) => {
      if (item.kind === 'single') {
        return <SectionCard key={idx} section={item.section} index={item.index} />
      }
      // parallel
      return (
        <div key={idx} className="border-2 border-dashed border-cream-300 rounded-xl p-3">
          <div className="font-display text-[10px] tracking-[0.18em] uppercase text-navy-900 font-extrabold mb-2">
            Skill-Phase · Hauptgruppe + Anfänger (parallel)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="font-display text-[10px] tracking-widest uppercase font-bold text-navy-800 mb-1.5 px-2 py-0.5 bg-navy-50 inline-block rounded">
                Hauptgruppe
              </div>
              <div className="space-y-2">
                {item.main.map((s, mIdx) => (
                  <SectionCard key={mIdx} section={s} index={item.startIndex + mIdx} />
                ))}
              </div>
            </div>
            <div>
              <div className="font-display text-[10px] tracking-widest uppercase font-bold text-amber-800 mb-1.5 px-2 py-0.5 bg-amber-50 inline-block rounded">
                Anfänger
              </div>
              <div className="space-y-2">
                {item.beginner.map((s, bIdx) => (
                  <SectionCard key={bIdx} section={s} index={item.startIndex + item.main.length + bIdx} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    })}
  </div>
)
```

Note: `SectionCard` is the existing per-section rendering. Adjust import path if it's inline.

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 4: Render-Smoke-Test**

Dev-Server → navigate to Plan-View. Existing plans (no group field) → all sections render as 'single' (group defaults to ALL). New dual-group plan → MAIN+BEGINNER side-by-side.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/training/TrainingPlanView.tsx
git commit -m "🎨 TrainingPlanView: 2-Col Layout für parallele MAIN/BEGINNER Sections

Linear über sections. Konsekutive MAIN+BEGINNER werden gemerged zu Skill-Phase-Block
mit Hauptgruppe links / Anfänger rechts (sm+). Mobile: stacked mit Group-Pille."
```

---

## Task 8: Frontend — PlanEditDrawer Group-Badges + Drill-Swap

**Files:**
- Modify: `frontend/src/components/training/PlanEditDrawer.tsx`
- Modify: `frontend/src/components/training/DrillPickerModal.tsx`

- [ ] **Step 1: Add complexityFilter prop to DrillPickerModal**

In `DrillPickerModal.tsx`:

```tsx
interface Props {
  drills: DrillResponse[]
  onSelect: (drill: DrillResponse) => void
  onClose: () => void
  /** Wenn 'BASIC': zeige nur BASIC-Drills (für BEGINNER-Sections). Default: alle. */
  complexityFilter?: 'BASIC' | null
}

export function DrillPickerModal({ drills, onSelect, onClose, complexityFilter }: Props) {
  // ... existing code

  const filtered = drills.filter(d => {
    if (complexityFilter === 'BASIC' && d.complexity !== 'BASIC') return false
    if (filter && !d.categories.includes(filter)) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ... rest
}
```

- [ ] **Step 2: Add Group-Badge to each section in PlanEditDrawer**

In `PlanEditDrawer.tsx`, find the section-rendering JSX (each section card). Inside the header of each section, add:

```tsx
{section.group && section.group !== 'ALL' && (
  <span className={`text-[9px] font-display font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
    section.group === 'MAIN' ? 'bg-navy-50 text-navy-800' : 'bg-amber-50 text-amber-800'
  }`}>
    {section.group === 'MAIN' ? 'Hauptgruppe' : 'Anfänger'}
  </span>
)}
```

- [ ] **Step 3: Add Pencil-Icon for Drill-Swap per section**

In each section card header, add (next to existing edit/delete icons):

```tsx
<button
  onClick={() => openSwapPicker(index)}
  title="Drill tauschen"
  className="p-1 text-gray-500 hover:text-navy-800 cursor-pointer"
>
  <SquarePen size={14} />
</button>
```

- [ ] **Step 4: Add state + handler for swap**

```typescript
const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null)

const openSwapPicker = (index: number) => {
  setSwapTargetIndex(index)
}

const closeSwapPicker = () => setSwapTargetIndex(null)

const handleSwapDrill = async (drill: DrillResponse) => {
  if (swapTargetIndex === null || !planId) return
  try {
    const updated = await api.patchPlanSection(planId, swapTargetIndex, drill.id)
    // Update local sections state with updated.content.sections
    setSections(updated.content.sections)
    setSwapTargetIndex(null)
  } catch (e) {
    console.error(e)
    // toast.show((e as Error).message, 'error')  if toast available
  }
}

// Computed: filter for swap target's group
const swapComplexityFilter = swapTargetIndex !== null && sections[swapTargetIndex]?.group === 'BEGINNER'
  ? 'BASIC' as const
  : null
```

- [ ] **Step 5: Render the swap-picker conditionally**

At end of component, alongside existing DrillPickerModal:

```tsx
{swapTargetIndex !== null && (
  <DrillPickerModal
    drills={drills}
    onSelect={handleSwapDrill}
    onClose={closeSwapPicker}
    complexityFilter={swapComplexityFilter}
  />
)}
```

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/training/PlanEditDrawer.tsx \
        frontend/src/components/training/DrillPickerModal.tsx
git commit -m "✨ PlanEditDrawer: Group-Badges + Drill-Swap-Pencil pro Section

- Group-Badge zeigt Hauptgruppe/Anfänger (ALL bekommt keinen Badge)
- Pencil-Icon öffnet DrillPickerModal mit Pre-Filter (BEGINNER → nur BASIC-Drills)
- API patchPlanSection swappt Drill-Meta, behält User-Edits"
```

---

## Task 9: E2E Test — Dual-Group Plan Generation

**Files:**
- Create: `frontend/e2e/training/plan-generate-dual-group.spec.ts`

- [ ] **Step 1: Write E2E test**

Look at existing training E2E tests for fixtures pattern. Create new test:

```typescript
import { test, expect } from '../helpers/fixtures'

test.describe('Trainingsplan — Dual Group', () => {
  test('generate plan with beginner group shows MAIN + BEGINNER sections', async ({ page }) => {
    // Setup: navigate to training-tag mit unlocked plan-creation
    // (use existing helper or seed via API)
    // ...

    // Open Generate-Drawer
    await page.getByRole('button', { name: /Plan generieren/i }).click()

    // Toggle Anfänger
    await page.getByLabel(/Mit Anfängergruppe/i).check()
    await page.getByLabel(/Anfänger-Anzahl/i).fill('4')

    // Submit
    await page.getByRole('button', { name: /generieren/i }).last().click()
    await page.waitForTimeout(2000) // generation may take a moment

    // Assert: Plan-View zeigt Hauptgruppe + Anfänger Headers
    await expect(page.getByText(/Hauptgruppe/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Anfänger/i).first()).toBeVisible()
  })
})
```

Note: This test may need additional setup based on the project's existing E2E patterns. Check `frontend/e2e/helpers/fixtures.ts` for available seed helpers.

- [ ] **Step 2: Run E2E test**

Run: `cd frontend && npx playwright test e2e/training/plan-generate-dual-group.spec.ts --reporter=list`
Expected: PASS. If FAIL due to missing seed-helpers, augment test setup.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/training/plan-generate-dual-group.spec.ts
git commit -m "🧪 E2E: dual-group Plan-Generation — MAIN + BEGINNER Sections"
```

---

## Task 10: E2E Test — Manual Drill Swap

**Files:**
- Create: `frontend/e2e/training/plan-edit-swap-drill.spec.ts`

- [ ] **Step 1: Write E2E test**

```typescript
import { test, expect } from '../helpers/fixtures'

test.describe('Trainingsplan — Manual Drill Swap', () => {
  test('swap drill in section keeps userNotes, replaces drill-meta', async ({ page }) => {
    // Setup: existing plan with at least 1 DRILL section
    // ...

    // Open PlanEditDrawer
    await page.getByRole('button', { name: /Plan bearbeiten/i }).click()

    // Add userNote to first DRILL section
    const drillSection = page.locator('[data-section-type="DRILL"]').first()
    await drillSection.locator('textarea[placeholder*="Notiz"]').fill('User-Notiz X')

    // Click swap-pencil
    await drillSection.locator('button[title*="Drill tauschen"]').click()

    // DrillPicker opens — select first
    await page.locator('button[data-drill-id]').first().click()
    await page.waitForTimeout(500)

    // Assert: userNote bleibt, drill-title hat sich geändert
    await expect(drillSection.locator('textarea[placeholder*="Notiz"]')).toHaveValue('User-Notiz X')
  })
})
```

Note: Selectors are placeholders — adjust based on actual DOM. Add `data-section-type` and `data-drill-id` attributes to components if not present.

- [ ] **Step 2: Add `data-` attributes if missing**

In `PlanEditDrawer.tsx`, ensure section cards have `data-section-type={section.sectionType}` and DrillPickerModal items have `data-drill-id={drill.id}`.

- [ ] **Step 3: Run E2E test**

Run: `cd frontend && npx playwright test e2e/training/plan-edit-swap-drill.spec.ts --reporter=list`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/training/plan-edit-swap-drill.spec.ts frontend/src/components/training/PlanEditDrawer.tsx frontend/src/components/training/DrillPickerModal.tsx
git commit -m "🧪 E2E: Manual Drill-Swap — userNotes bleiben, Drill-Meta wird ersetzt"
```

---

## Task 11: Bug-Sidequest — PlanEditDrawer add-drill closes editor

**Files:**
- Modify: `frontend/src/components/training/PlanEditDrawer.tsx`

- [ ] **Step 1: Reproduce bug locally**

Dev-Server → Plan editieren → "Drill hinzufügen" klicken → Drill auswählen.
Beobachtung: Editor schließt sich, kein Drill hinzugefügt.

- [ ] **Step 2: Fix anti-pattern setExpandedSet inside setSections updater**

In `PlanEditDrawer.tsx`, find `addDrill` function (around line 340). Change:

```typescript
const addDrill = (drill: DrillResponse) => {
  setSections(prev => {
    const next = [...prev, {
      drillId: drill.id,
      sectionType: pickerType,
      title: drill.name,
      durationMinutes: pickerType === 'WARMUP' ? 15 : 20,
      rounds: null, adaptationNotes: null,
      rotationPlan: drill.rotation, setupNotes: null, tips: null,
      groupSetup: null, userNotes: null, parallelGroup: null, playersPerGroup: null,
      group: 'ALL' as const,
    } as TrainingPlanSectionResponse]
    return next
  })
  // setExpandedSet aus dem updater raus — separater state-update
  setExpandedSet(prev => {
    const next = new Set(prev)
    next.add(sections.length) // current length BEFORE add = neuer Index
    return next
  })
  setShowPicker(false)
}
```

- [ ] **Step 3: Investigate Vaul NestedRoot close-propagation**

Test: nach Fix in Step 2 nochmal probieren. Wenn Editor immer noch schließt → tieferes Problem.

Diagnose:
- `DrillPickerModal` ist `<ResponsiveSheet nested>` → nutzt `Drawer.NestedRoot`
- Wenn nested-Sheet schließt, propagiert das nach oben?
- Test: Drill auswählen → Console-Log in PlanEditDrawer's onClose ergänzen

In `PlanEditDrawer.tsx`, temporär Debug-Log in onClose-Prop:

```typescript
// In Parent (TrainingPlanView oder wo PlanEditDrawer gerendert wird):
<PlanEditDrawer
  open={editing}
  onClose={() => { console.log('PlanEditDrawer.onClose fired'); setEditing(false) }}
  ...
/>
```

Drill auswählen → schaue im DevTools-Console: wird `PlanEditDrawer.onClose` aufgerufen?

- [ ] **Step 4: If propagation confirmed — stop event propagation in nested-sheet**

In `DrillPickerModal.tsx` (around the onSelect button):

```tsx
<button
  onClick={(e) => { e.stopPropagation(); onSelect(drill) }}
  data-drill-id={drill.id}
  ...
>
```

Run reproduce → Editor sollte offen bleiben.

- [ ] **Step 5: Verify with E2E (if Task 10 E2E covers this) or manual**

Run E2E suite or manual reproduce.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/training/PlanEditDrawer.tsx \
        frontend/src/components/training/DrillPickerModal.tsx
git commit -m "🐛 PlanEditDrawer: add-drill schloss Editor (setState-Anti-Pattern + Event-Propagation)

- setExpandedSet aus setSections-Updater raus (React-StrictMode-Compliant)
- Drill-Button stopPropagation damit nested-Vaul-Close nicht zum Parent propagiert"
```

---

## Final Step: Push + Verify CI

- [ ] **Run full test suites locally one more time**

```bash
cd /home/hungl/privat/softball-lineup/backend && ./mvnw test -s .mvn/local-settings.xml
cd /home/hungl/privat/softball-lineup/frontend && npm run build && npm test && npx playwright test e2e/training/
```

Expected: All PASS.

- [ ] **Push to master**

```bash
git push
```

Auto-Deploy triggers + CI runs. Monitor via `gh -R Hungfu123/softball-planner run list --branch master --limit 2`.

---

## Self-Review

Spec coverage:
- ✅ Approach B (group field) — Task 1
- ✅ Generator dual-group branch — Task 2
- ✅ withBeginnerGroup + beginnerCount in request — Tasks 1+3
- ✅ Manual drill swap endpoint — Task 4
- ✅ Frontend types + API — Task 5
- ✅ Generator-Form checkbox — Task 6
- ✅ PlanDisplay group-aware layout — Task 7
- ✅ PlanEditor badges + swap — Task 8
- ✅ E2E tests — Tasks 9+10
- ✅ Bug-sidequest — Task 11
- ✅ Edge cases: tooFewBeginners, noBasicDrills — Task 2
- ✅ Backward-compat default ALL — Task 1
