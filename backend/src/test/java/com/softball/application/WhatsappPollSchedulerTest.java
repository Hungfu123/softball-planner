package com.softball.application;

import com.softball.domain.model.PollMode;
import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.CoupledPollTargetResolver;
import com.softball.domain.service.PollDueEvaluator;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WhatsappPollSchedulerTest {

    private final WhatsappPollRepository repo = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final TrainingRepository trainingRepo = mock(TrainingRepository.class);
    private final WhatsappPollScheduler scheduler =
            new WhatsappPollScheduler(repo, sender, new PollDueEvaluator(), trainingRepo,
                    new CoupledPollTargetResolver(), Clock.systemDefaultZone());

    private WhatsappPoll due() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(1L);
        p.setGroupId("g@g.us");
        p.setTitle("Training?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setMode(PollMode.TRAINING);
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    // Zieltraining: Dienstag 2026-07-14
    private Training targetTraining() {
        return new Training(42L, LocalDate.of(2026, 7, 14), "20:00", "Park");
    }

    // Vortag (Montag) 18:00 — Versandzeitpunkt fuer das Zieltraining am Dienstag
    private final LocalDateTime monAt1800 = LocalDateTime.of(2026, 7, 13, 18, 0);

    @Test
    void tick_sendsDuePoll_andStampsLastSentAtAndTrainingId() {
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));

        scheduler.tick(monAt1800);

        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList(), anyBoolean(), any());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null && Long.valueOf(42L).equals(p.getLastSentTrainingId())));
    }

    @Test
    void tick_catchesUpAfterMissedMinute() {
        // Verpasste Scheduler-Minute (Deploy/Neustart) darf die Umfrage nicht verlieren:
        // am Versandtag wird ab der Sendezeit nachgesendet, der lastSentTrainingId-Guard
        // verhindert Doppelversand.
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));

        scheduler.tick(monAt1800.plusMinutes(47));

        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList(), anyBoolean(), any());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null && Long.valueOf(42L).equals(p.getLastSentTrainingId())));
    }

    @Test
    void tick_skipsBeforeSendTime() {
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));

        scheduler.tick(monAt1800.minusMinutes(1));

        verify(sender, never()).sendPoll(any(), any(), anyList(), anyBoolean(), any());
        verify(repo, never()).save(any());
    }

    @Test
    void tick_skipsWhenNoTargetTrainingFound() {
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());  // kein Zieltraining

        scheduler.tick(monAt1800);

        verify(sender, never()).sendPoll(any(), any(), anyList(), anyBoolean(), any());
        verify(repo, never()).save(any());
    }

    @Test
    void tick_sendFailure_doesNotStampLastSentAt() {
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));
        doThrow(new RuntimeException("offline")).when(sender).sendPoll(any(), any(), anyList(), anyBoolean(), any());

        scheduler.tick(monAt1800);

        verify(repo, never()).save(any());
    }

    @Test
    void tick_stampsLastSentMessageId() {
        final WhatsappPoll poll = due();
        when(repo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));
        when(sender.sendPoll(any(), any(), anyList(), anyBoolean(), any())).thenReturn("msg-123");

        scheduler.tick(monAt1800);

        assertThat(poll.getLastSentMessageId()).isEqualTo("msg-123");
        assertThat(poll.getLastSentTrainingId()).isEqualTo(42L);
        verify(repo).save(poll);
    }

    private WhatsappPoll oneOffDue() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(9L);
        p.setGroupId("g@g.us");
        p.setTitle("Einmalig");
        p.setOptions(List.of("Ja", "Nein"));
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(LocalDate.of(2026, 8, 5));
        p.setTime(LocalTime.of(10, 25));
        p.setEnabled(true);
        return p;
    }

    @Test
    void tick_sendsDueOneOff_withoutTrainingId() {
        final WhatsappPoll poll = oneOffDue();
        when(repo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());
        when(sender.sendPoll(any(), any(), anyList(), anyBoolean(), any())).thenReturn("msg-1");

        scheduler.tick(LocalDateTime.of(2026, 8, 5, 10, 25));

        verify(sender).sendPoll(eq("g@g.us"), eq("Einmalig"), anyList(), anyBoolean(), any());
        assertThat(poll.getLastSentMessageId()).isEqualTo("msg-1");
        assertThat(poll.getLastSentTrainingId()).isNull();
    }

    @Test
    void tick_oneOffNotResentAfterSent() {
        final WhatsappPoll poll = oneOffDue();
        poll.setLastSentAt(LocalDateTime.of(2026, 8, 5, 10, 25));
        when(repo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());

        scheduler.tick(LocalDateTime.of(2026, 8, 5, 10, 25));

        verify(sender, never()).sendPoll(any(), any(), anyList(), anyBoolean(), any());
    }

    @Test
    void run_usesBerlinZone_sendsDuePoll() {
        // Regression fuer JVM-Default-Zone-Bug: run() muss Europe/Berlin nutzen, nicht UTC.
        final Clock berlinClock = Clock.fixed(
                ZonedDateTime.of(2026, 7, 13, 18, 0, 0, 0, ZoneId.of("Europe/Berlin")).toInstant(),
                ZoneId.of("Europe/Berlin"));
        final WhatsappPollScheduler berlinScheduler =
                new WhatsappPollScheduler(repo, sender, new PollDueEvaluator(), trainingRepo,
                        new CoupledPollTargetResolver(), berlinClock);
        when(repo.findAll()).thenReturn(List.of(due()));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(targetTraining()));

        berlinScheduler.run();

        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList(), anyBoolean(), any());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null));
    }
}
