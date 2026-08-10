package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenScoringServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SpielbogenSlotRepository slotRepo;
    @Mock private SpielbogenAtBatRepository atBatRepo;
    @Mock private SpielbogenStealingRepository stealingRepo;
    @Mock private SpielbogenSubstitutionRepository subRepo;
    @Mock private SpielbogenPositionChangeRepository positionChangeRepo;
    @Mock private SpielbogenRunnerAdvanceRepository runnerAdvanceRepo;
    @Mock private GameClockService gameClockService;

    @InjectMocks
    private SpielbogenScoringService service;

    private Spielbogen liveBogen;
    private SpielbogenSlot homeSlot;

    @BeforeEach
    void setUp() {
        liveBogen = new Spielbogen();
        liveBogen.setId(1L);
        liveBogen.setStatus(BogenStatus.LIVE);
        liveBogen.setCurrentInning(1);
        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setHomeRuns(0);
        liveBogen.setAwayRuns(0);

        homeSlot = new SpielbogenSlot();
        homeSlot.setId(50L);
        homeSlot.setBogen(liveBogen);
        homeSlot.setSide(BogenSide.HOME);
        homeSlot.setName("Olaf");
    }

    @Test
    void recordAtBatRejectsDraftStatus() {
        liveBogen.setStatus(BogenStatus.DRAFT);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     null, null, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("LIVE");
    }

    @Test
    void recordAtBatAssignsNextSequence() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(atBatRepo.findMaxSequenceForBogenSide(1L, BogenSide.HOME)).thenReturn(4);
        when(atBatRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SpielbogenAtBat saved = service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                    null, null, null, false, null, 0, 0, null);
        assertThat(saved.getSequence()).isEqualTo(5);
    }

    @Test
    void recordAtBatHomerunIncrementsRuns() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(atBatRepo.findMaxSequenceForBogenSide(any(), any())).thenReturn(0);
        when(atBatRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.HOMERUN, null, null, null, false, null, 1, 1, null);

        assertThat(liveBogen.getHomeRuns()).isEqualTo(1);
    }

    @Test
    void recordAtBatRejectsOutTypeOnNonOutResult() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     OutType.GROUNDER, null, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("outType");
    }

    @Test
    void recordAtBatRejectsFielderChainOutOfRange() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.OUT,
                                                     OutType.GROUNDER, null, List.of(0, 3), false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("fielderChain");
    }

    @Test
    void recordAtBatRejectsErrorWithoutPosition() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.OUT,
                                                     null, null, null, true, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("errorPosition");
    }

    @Test
    void recordAtBatRejectsSlotFromDifferentBogen() {
        Spielbogen other = new Spielbogen();
        other.setId(99L);
        homeSlot.setBogen(other);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));

        assertThatThrownBy(() -> service.recordAtBat(1L, BogenSide.HOME, 50L, 1, AtBatResult.SINGLE,
                                                     null, null, null, false, null, 0, 0, null))
            .isInstanceOf(BusinessValidationException.class).hasMessageContaining("Spielbogen");
    }

    @Test
    void recordStealingSavesEvent() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(stealingRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var event = service.recordStealingEvent(1L, BogenSide.HOME, 50L, 1, StealingEventType.STOLEN_BASE, 1, 2);

        assertThat(event.getType()).isEqualTo(StealingEventType.STOLEN_BASE);
        verify(stealingRepo).save(any());
    }

    @Test
    void recordSubstitutionStores() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(50L)).thenReturn(Optional.of(homeSlot));
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var sub = service.recordSubstitution(1L, BogenSide.HOME, 50L, 3, "Klaus", false);

        assertThat(sub.getPlayerOutName()).isEqualTo("Olaf");
        assertThat(sub.getPlayerInName()).isEqualTo("Klaus");
        assertThat(sub.getIsPinchHitter()).isFalse();
    }

    @Test
    void undoLastDeletesAndRecomputesScore() {
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setRunsScored(2);
        last.setSide(BogenSide.HOME);
        last.setInning(1);
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(1);
        liveBogen.setHomeRuns(2);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 1)).thenReturn(0L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        assertThat(liveBogen.getHomeRuns()).isEqualTo(0);
    }

    @Test
    void undoLastRevertsSideAndInningWhenOutsDropBelow3() {
        // Scenario: HOME hatte 3rd-Out in inning 1, Auto-Switch zu AWAY inning 2 (HOME-Out zählt neues Inning hoch).
        // User undoed das 3rd-Out → outs nun unter 3 → side soll zurück zu HOME, inning 1.
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setRunsScored(0);
        last.setSide(BogenSide.HOME);
        last.setInning(1);
        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setCurrentInning(2); // HOME-Out in inning 1 → currentInning increments to 2
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 1)).thenReturn(2L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.HOME);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(1);
    }

    @Test
    void undoLastRevertsInningWhenAwayThirdOutEndedInning() {
        // Scenario: AWAY 3rd-Out in inning 2 → Side-Switch zu HOME, inning 3.
        // User undoed → outs <3 in AWAY/2 → revert zu AWAY, inning 2.
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(101L);
        last.setRunsScored(0);
        last.setSide(BogenSide.AWAY);
        last.setInning(2);
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(3);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.AWAY)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.AWAY, 2)).thenReturn(2L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.AWAY);

        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(2);
    }

    @Test
    void switchSideFlipsCurrentSideWhenOutsReach3() {
        liveBogen.setCurrentSide(BogenSide.AWAY);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.countOutsInInning(1L, BogenSide.AWAY, 1)).thenReturn(3L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.switchSide(1L);

        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.HOME);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(1);
    }

    @Test
    void switchSideAdvancesInningAfterBothSidesPlayed() {
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 1)).thenReturn(3L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.switchSide(1L);

        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(2);
    }

    @Test
    void recordPositionSwap_basicTwoSlotSwap_updatesBothSlots() {
        SpielbogenSlot slotP = new SpielbogenSlot();
        slotP.setId(100L);
        slotP.setBogen(liveBogen);
        slotP.setSide(BogenSide.HOME);
        slotP.setPosition("P");

        SpielbogenSlot slotC = new SpielbogenSlot();
        slotC.setId(101L);
        slotC.setBogen(liveBogen);
        slotC.setSide(BogenSide.HOME);
        slotC.setPosition("C");

        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(100L)).thenReturn(Optional.of(slotP));
        when(slotRepo.findById(101L)).thenReturn(Optional.of(slotC));
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(slotP, slotC));
        when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(positionChangeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var entries = List.of(
            new SpielbogenScoringService.SwapEntry(100L, "C"),
            new SpielbogenScoringService.SwapEntry(101L, "P")
        );
        var result = service.recordPositionSwap(1L, BogenSide.HOME, 3, entries);

        assertEquals(2, result.size());
        assertEquals("C", slotP.getPosition());
        assertEquals("P", slotC.getPosition());
        assertEquals(result.get(0).getGroupId(), result.get(1).getGroupId());
        assertEquals("P", result.get(0).getOldPosition());
        assertEquals("C", result.get(0).getNewPosition());
    }

    @Test
    void recordPositionSwap_ringSwap_threeSlots() {
        SpielbogenSlot p = new SpielbogenSlot();
        p.setId(100L);
        p.setBogen(liveBogen);
        p.setSide(BogenSide.HOME);
        p.setPosition("P");

        SpielbogenSlot c = new SpielbogenSlot();
        c.setId(101L);
        c.setBogen(liveBogen);
        c.setSide(BogenSide.HOME);
        c.setPosition("C");

        SpielbogenSlot ss = new SpielbogenSlot();
        ss.setId(102L);
        ss.setBogen(liveBogen);
        ss.setSide(BogenSide.HOME);
        ss.setPosition("SS");

        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(100L)).thenReturn(Optional.of(p));
        when(slotRepo.findById(101L)).thenReturn(Optional.of(c));
        when(slotRepo.findById(102L)).thenReturn(Optional.of(ss));
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(p, c, ss));
        when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(positionChangeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var entries = List.of(
            new SpielbogenScoringService.SwapEntry(100L, "C"),
            new SpielbogenScoringService.SwapEntry(101L, "SS"),
            new SpielbogenScoringService.SwapEntry(102L, "P")
        );
        var result = service.recordPositionSwap(1L, BogenSide.HOME, 5, entries);

        assertEquals(3, result.size());
        assertEquals("C", p.getPosition());
        assertEquals("SS", c.getPosition());
        assertEquals("P", ss.getPosition());
        String gid = result.get(0).getGroupId();
        assertEquals(gid, result.get(1).getGroupId());
        assertEquals(gid, result.get(2).getGroupId());
    }

    @Test
    void recordPositionSwap_duplicatePosition_throws() {
        SpielbogenSlot p = new SpielbogenSlot();
        p.setId(100L);
        p.setBogen(liveBogen);
        p.setSide(BogenSide.HOME);
        p.setPosition("P");

        SpielbogenSlot c = new SpielbogenSlot();
        c.setId(101L);
        c.setBogen(liveBogen);
        c.setSide(BogenSide.HOME);
        c.setPosition("C");

        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(100L)).thenReturn(Optional.of(p));
        when(slotRepo.findById(101L)).thenReturn(Optional.of(c));
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(List.of(p, c));

        var entries = List.of(
            new SpielbogenScoringService.SwapEntry(100L, "C"),
            new SpielbogenScoringService.SwapEntry(101L, "C")
        );
        assertThrows(BusinessValidationException.class,
            () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, entries));
    }

    @Test
    void recordPositionSwap_invalidPosition_throws() {
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(100L);
        slot.setBogen(liveBogen);
        slot.setSide(BogenSide.HOME);
        slot.setPosition("P");

        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));

        var entries = List.of(new SpielbogenScoringService.SwapEntry(100L, "XYZ"));
        assertThrows(BusinessValidationException.class,
            () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, entries));
    }

    @Test
    void recordPositionSwap_emptyEntries_throws() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));

        assertThrows(BusinessValidationException.class,
            () -> service.recordPositionSwap(1L, BogenSide.HOME, 3, List.of()));
    }

    @Test
    void deleteLastStealingForSide_basic_deletesLatest() {
        SpielbogenStealingEvent ev = new SpielbogenStealingEvent();
        ev.setId(99L);
        ev.setBogen(liveBogen);
        ev.setSide(BogenSide.HOME);
        ev.setInning(2);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(Optional.of(ev));

        service.deleteLastStealingForSide(1L, BogenSide.HOME);

        verify(stealingRepo).deleteById(99L);
    }

    @Test
    void deleteLastStealingForSide_noEvent_throws() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(Optional.empty());

        assertThrows(BusinessValidationException.class,
            () -> service.deleteLastStealingForSide(1L, BogenSide.HOME));
    }

    // --- helper ---
    private SpielbogenSlot slotFor(final Spielbogen bogen, final Long id, final BogenSide side, final String position) {
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(id);
        slot.setBogen(bogen);
        slot.setSide(side);
        slot.setPosition(position);
        return slot;
    }

    @Test
    void recordAtBat_withRunnerAdvances_persistsAll() {
        SpielbogenSlot batter = slotFor(liveBogen, 100L, BogenSide.HOME, "P");
        SpielbogenSlot runner = slotFor(liveBogen, 200L, BogenSide.HOME, "C");
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(slotRepo.findById(100L)).thenReturn(Optional.of(batter));
        when(slotRepo.findById(200L)).thenReturn(Optional.of(runner));
        SpielbogenAtBat persistedAB = new SpielbogenAtBat();
        persistedAB.setId(99L);
        persistedAB.setBogen(liveBogen);
        when(atBatRepo.save(any())).thenReturn(persistedAB);
        when(atBatRepo.countOutsInInning(anyLong(), any(), anyInt())).thenReturn(0L);
        when(runnerAdvanceRepo.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        var advances = List.of(
            new SpielbogenScoringService.RunnerAdvanceEntry(200L, 1, 2, RunnerAdvanceReason.BB_FORCE)
        );

        service.recordAtBat(
            1L, BogenSide.HOME, 100L, 1, AtBatResult.WALK,
            null, null, null, false, null, 0, 0, null, advances
        );

        verify(runnerAdvanceRepo).saveAll(argThat(list -> list.size() == 1
            && list.get(0).getReason() == RunnerAdvanceReason.BB_FORCE
            && list.get(0).getFromBase() == 1
            && list.get(0).getToBase() == 2));
    }

    // === Score / Undo symmetry regressions (Spielbogen ↔ Legacy parity) ===

    /** BUG A: Korrektur (updateLastAtBatBaseState) darf gestohlene Home-Runs (SB/WP/PB toBase=4)
     *  nicht aus dem Score löschen. Recompute summierte vorher nur AtBats. */
    @Test
    void correctLastAtBat_preservesStealingRuns() {
        SpielbogenSlot awaySlot = new SpielbogenSlot();
        awaySlot.setId(60L);
        awaySlot.setBogen(liveBogen);
        awaySlot.setSide(BogenSide.AWAY);
        awaySlot.setName("Runner");

        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setSide(BogenSide.AWAY);
        last.setInning(1);
        last.setRunsScored(0);

        // Ein gestohlener Run (toBase=4, STOLEN_BASE) für AWAY existiert.
        SpielbogenStealingEvent stolenHome = new SpielbogenStealingEvent();
        stolenHome.setId(7L);
        stolenHome.setSide(BogenSide.AWAY);
        stolenHome.setType(StealingEventType.STOLEN_BASE);
        stolenHome.setToBase(4);

        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setAwayRuns(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.AWAY)).thenReturn(Optional.of(last));
        when(atBatRepo.findByBogenId(1L)).thenReturn(List.of(last));
        when(stealingRepo.findByBogenId(1L)).thenReturn(List.of(stolenHome));
        when(atBatRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.updateLastAtBatBaseState(1L, BogenSide.AWAY, BogenBaseState.empty(), 0);

        // Der gestohlene Run muss erhalten bleiben.
        assertThat(liveBogen.getAwayRuns()).isEqualTo(1);
    }

    /** BUG C: AB-Undo darf frühere Stealing-Events NICHT mit-löschen.
     *  Frontend routet Stealing-Undo separat (nach Recency). */
    @Test
    void undoLast_doesNotSweepEarlierStealingEvents() {
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setSide(BogenSide.HOME);
        last.setInning(1);
        last.setRunsScored(0);
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 1)).thenReturn(0L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        verify(stealingRepo, never()).deleteById(any());
    }

    /** BUG B: Undo nach Walkoff/Game-End (Status DONE) muss das Spiel wieder öffnen. */
    @Test
    void undoLast_reopensGameWhenStatusDone() {
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setSide(BogenSide.HOME);
        last.setInning(7);
        last.setRunsScored(1);
        liveBogen.setStatus(BogenStatus.DONE);
        liveBogen.setEndedAt(java.time.Instant.now());
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(7);
        liveBogen.setHomeRuns(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 7)).thenReturn(0L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        assertThat(liveBogen.getStatus()).isEqualTo(BogenStatus.LIVE);
        assertThat(liveBogen.getEndedAt()).isNull();
        assertThat(liveBogen.getHomeRuns()).isEqualTo(0);
        // Regressionsschutz: ein Bogen ohne je gestartete Uhr verhaelt sich unveraendert.
        assertThat(liveBogen.getTimerRunningSince()).isNull();
        assertThat(liveBogen.getTimerAccumulatedSeconds()).isZero();
    }

    // Task 4: der einzige Schreibvorgang vom Spielablauf in die Uhr. reopenIfDone() nullt
    // endedAt bei Undo eines Walkoff/Game-End — muss die Uhr davor pausieren, sonst verlöre die
    // Ableitung ihre Obergrenze. Der Deckelungs-Beweis selbst laeuft in der Integration mit
    // echtem GameClockService (ein Mockito-Mock wuerde einen falschen Wert nicht auffangen).
    @Test
    void undoLast_reopensGameWhenStatusDone_banksRunningClockBeforeEndedAtIsCleared() {
        SpielbogenAtBat last = new SpielbogenAtBat();
        last.setId(99L);
        last.setSide(BogenSide.HOME);
        last.setInning(7);
        last.setRunsScored(1);
        liveBogen.setStatus(BogenStatus.DONE);
        liveBogen.setEndedAt(java.time.Instant.now());
        liveBogen.setTimerRunningSince(java.time.Instant.now().minusSeconds(90));
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(7);
        liveBogen.setHomeRuns(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 7)).thenReturn(0L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(gameClockService).pauseClockBeforeReopen(liveBogen);
    }

    /** Zweiter Aufrufer von reopenIfDone (Stealing-Undo) — muss ebenso an die Uhr denken. */
    @Test
    void deleteLastStealing_reopensGameWhenStatusDone_banksRunningClockBeforeEndedAtIsCleared() {
        SpielbogenStealingEvent ev = new SpielbogenStealingEvent();
        ev.setId(7L);
        ev.setBogen(liveBogen);
        ev.setSide(BogenSide.HOME);
        ev.setInning(7);
        ev.setType(StealingEventType.STOLEN_BASE);
        ev.setToBase(4);
        liveBogen.setStatus(BogenStatus.DONE);
        liveBogen.setEndedAt(java.time.Instant.now());
        liveBogen.setTimerRunningSince(java.time.Instant.now().minusSeconds(90));
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(7);
        liveBogen.setHomeRuns(1);
        when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(Optional.of(ev));
        when(atBatRepo.countOutsInInning(1L, BogenSide.HOME, 7)).thenReturn(0L);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deleteLastStealingForSide(1L, BogenSide.HOME);

        verify(gameClockService).pauseClockBeforeReopen(liveBogen);
    }

    /** BUG E: Stealing-Undo muss den gestohlenen Home-Run vom Score abziehen. */
    @Test
    void deleteLastStealing_subtractsScoredRun() {
        SpielbogenStealingEvent ev = new SpielbogenStealingEvent();
        ev.setId(7L);
        ev.setBogen(liveBogen);
        ev.setSide(BogenSide.AWAY);
        ev.setInning(1);
        ev.setType(StealingEventType.WILD_PITCH);
        ev.setToBase(4);
        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setCurrentInning(1);
        liveBogen.setAwayRuns(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.AWAY)).thenReturn(Optional.of(ev));
        when(atBatRepo.countOutsInInning(1L, BogenSide.AWAY, 1)).thenReturn(0L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deleteLastStealingForSide(1L, BogenSide.AWAY);

        verify(stealingRepo).deleteById(7L);
        assertThat(liveBogen.getAwayRuns()).isEqualTo(0);
    }

    /** BUG F: Undo eines Caught-Stealing das der 3. Out war muss den Auto-Switch zurücknehmen. */
    @Test
    void deleteLastStealing_revertsAutoSwitchWhenCaughtStealingWasThirdOut() {
        // AWAY CS = 3. Out in inning 1 → Auto-Switch zu HOME (gleiche Inning).
        SpielbogenStealingEvent ev = new SpielbogenStealingEvent();
        ev.setId(7L);
        ev.setBogen(liveBogen);
        ev.setSide(BogenSide.AWAY);
        ev.setInning(1);
        ev.setType(StealingEventType.CAUGHT_STEALING);
        ev.setToBase(2);
        liveBogen.setCurrentSide(BogenSide.HOME);
        liveBogen.setCurrentInning(1);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(stealingRepo.findLatestForBogenIdAndSide(1L, BogenSide.AWAY)).thenReturn(Optional.of(ev));
        when(atBatRepo.countOutsInInning(1L, BogenSide.AWAY, 1)).thenReturn(2L);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deleteLastStealingForSide(1L, BogenSide.AWAY);

        verify(stealingRepo).deleteById(7L);
        assertThat(liveBogen.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(liveBogen.getCurrentInning()).isEqualTo(1);
    }

    @Test
    void undoLast_wrongSideAndNotPriorAutoSwitch_throws() {
        // currentSide=AWAY, currentInning=3 — passing HOME side with last.inning=1 (not inning 2 = currentInning-1)
        liveBogen.setCurrentSide(BogenSide.AWAY);
        liveBogen.setCurrentInning(3);
        SpielbogenAtBat oldHome = new SpielbogenAtBat();
        oldHome.setId(50L);
        oldHome.setSide(BogenSide.HOME);
        oldHome.setInning(1); // Not currentInning - 1 (which would be 2), so not a direct auto-switch predecessor
        oldHome.setSequence(10);
        oldHome.setRunsScored(0);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(oldHome));

        assertThrows(BusinessValidationException.class,
            () -> service.undoLast(1L, BogenSide.HOME));
    }
}
