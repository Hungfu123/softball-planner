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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenScoringServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SpielbogenSlotRepository slotRepo;
    @Mock private SpielbogenAtBatRepository atBatRepo;
    @Mock private SpielbogenStealingRepository stealingRepo;
    @Mock private SpielbogenSubstitutionRepository subRepo;

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
        liveBogen.setHomeRuns(2);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(liveBogen));
        when(atBatRepo.findLatestForSide(1L, BogenSide.HOME)).thenReturn(Optional.of(last));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.undoLast(1L, BogenSide.HOME);

        verify(atBatRepo).deleteById(99L);
        assertThat(liveBogen.getHomeRuns()).isEqualTo(0);
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
}
