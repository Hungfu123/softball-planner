package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Season;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SeasonService seasonService;
    @Mock private SpielbogenSlotService slotService;
    @Mock private GameClockService gameClockService;

    @InjectMocks
    private SpielbogenService service;

    private Spielbogen draftBogen;

    @BeforeEach
    void setUp() {
        draftBogen = new Spielbogen(LocalDate.of(2026, 4, 30), "Krefeld",
                                     "Wuppertal", "Cologne", null);
        draftBogen.setId(1L);
    }

    @Test
    void createRejectsSameTeamNames() {
        assertThatThrownBy(() -> service.create(LocalDate.of(2026, 4, 30), null,
                                                "Team A", "Team A", null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("unterschiedlich");
    }

    @Test
    void createSavesBogenWithDraftStatus() {
        when(bogenRepo.save(any())).thenAnswer(inv -> {
            Spielbogen b = inv.getArgument(0);
            b.setId(42L);
            return b;
        });

        Spielbogen result = service.create(LocalDate.of(2026, 4, 30), "Krefeld",
                                           "Wuppertal", "Cologne", null);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.DRAFT);
        assertThat(result.getCurrentInning()).isEqualTo(1);
        assertThat(result.getCurrentSide()).isEqualTo(BogenSide.AWAY);
        assertThat(result.getId()).isEqualTo(42L);
    }

    @Test
    void createWithSeasonIdLooksUpSeason() {
        Season season = new Season(10L, "Saison 2026", 2026);
        when(seasonService.findById(10L)).thenReturn(season);
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.create(LocalDate.of(2026, 4, 30), null,
                                           "Wuppertal", "Cologne", 10L);

        assertThat(result.getSeason()).isNotNull();
        assertThat(result.getSeason().getId()).isEqualTo(10L);
    }

    @Test
    void deleteRejectsUnknownId() {
        when(bogenRepo.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> service.delete(99L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void startTransitionsDraftToLiveWhenLineupsValid() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotService.getLineup(1L)).thenReturn(
            new SpielbogenSlotService.LineupResult(buildSlots(9), buildSlots(9))
        );
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.start(1L);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.LIVE);
    }

    @Test
    void startRejectsIfHomeLineupTooShort() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotService.getLineup(1L)).thenReturn(
            new SpielbogenSlotService.LineupResult(buildSlots(8), buildSlots(9))
        );

        assertThatThrownBy(() -> service.start(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("HOME");
    }

    @Test
    void startRejectsIfAlreadyLive() {
        draftBogen.setStatus(BogenStatus.LIVE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));

        assertThatThrownBy(() -> service.start(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("DRAFT");
    }

    @Test
    void endTransitionsLiveToDone() {
        draftBogen.setStatus(BogenStatus.LIVE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.end(1L, null, null);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.DONE);
        assertThat(result.getEndedAt()).isNotNull();
    }

    @Test
    void endAcceptsScoreOverride() {
        draftBogen.setStatus(BogenStatus.LIVE);
        draftBogen.setHomeRuns(7);
        draftBogen.setAwayRuns(3);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.end(1L, 10, 5);

        assertThat(result.getHomeRuns()).isEqualTo(10);
        assertThat(result.getAwayRuns()).isEqualTo(5);
    }

    @Test
    void reopenTransitionsDoneToLive() {
        draftBogen.setStatus(BogenStatus.DONE);
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.reopen(1L);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.LIVE);
        assertThat(result.getEndedAt()).isNull();
    }

    @Test
    void reopenRejectsDraft() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));

        assertThatThrownBy(() -> service.reopen(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("DONE");
    }

    // Task 4: der einzige Schreibvorgang vom Spielablauf in die Uhr. Reopen muss die Uhr VOR
    // dem Nullen von endedAt pausieren — sonst verlöre die Ableitung ihre Obergrenze. Der
    // Deckelungs-Beweis selbst laeuft in der Integration mit echtem GameClockService (ein
    // Mockito-Mock wuerde einen falschen Wert nicht auffangen).
    //
    // Review-Fund (gleicher Fehler in GameServiceTest/SpielbogenScoringServiceTest): eine reine
    // verify(...) dass der Aufruf passiert ist, prüft NICHT die Reihenfolge — bogen.setEndedAt
    // (null) ist kein Mock-Aufruf, ein InOrder zwischen zwei Mocks würde die Mutation auf
    // demselben Objekt gar nicht sehen. Stattdessen wird per doAnswer erfasst, ob endedAt zum
    // Zeitpunkt des Bankings noch gesetzt war.
    @Test
    void reopen_runningClock_banksBeforeEndedAtIsCleared() {
        draftBogen.setStatus(BogenStatus.DONE);
        draftBogen.setEndedAt(Instant.now());
        draftBogen.setTimerRunningSince(Instant.now().minusSeconds(90));
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        final Instant[] endedAtWhenBanked = new Instant[1];
        org.mockito.Mockito.doAnswer(inv -> {
            endedAtWhenBanked[0] = draftBogen.getEndedAt();
            return null;
        }).when(gameClockService).pauseClockBeforeReopen(draftBogen);

        service.reopen(1L);

        verify(gameClockService).pauseClockBeforeReopen(draftBogen);
        assertThat(endedAtWhenBanked[0]).isNotNull();
        assertThat(draftBogen.getEndedAt()).isNull();
    }

    @Test
    void reopen_regressionGuard_bogenWithoutClock_behavesAsBefore() {
        draftBogen.setStatus(BogenStatus.DONE);
        draftBogen.setEndedAt(Instant.now());
        assertThat(draftBogen.getTimerRunningSince()).isNull();
        assertThat(draftBogen.getTimerAccumulatedSeconds()).isZero();
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(bogenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Spielbogen result = service.reopen(1L);

        assertThat(result.getStatus()).isEqualTo(BogenStatus.LIVE);
        assertThat(result.getEndedAt()).isNull();
        assertThat(result.getTimerRunningSince()).isNull();
        assertThat(result.getTimerAccumulatedSeconds()).isZero();
    }

    private List<SpielbogenSlot> buildSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
