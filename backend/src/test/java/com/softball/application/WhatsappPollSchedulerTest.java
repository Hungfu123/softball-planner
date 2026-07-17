package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.PollDueEvaluator;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.DayOfWeek;
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
    private final WhatsappPollScheduler scheduler =
            new WhatsappPollScheduler(repo, sender, new PollDueEvaluator());

    private WhatsappPoll due() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(1L);
        p.setGroupId("g@g.us");
        p.setTitle("Training?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    private final LocalDateTime tueAt1800 = LocalDateTime.of(2026, 7, 14, 18, 0);

    @Test
    void tick_sendsDuePoll_andStampsLastSentAt() {
        when(repo.findAll()).thenReturn(List.of(due()));
        scheduler.tick(tueAt1800);
        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList(), anyBoolean(), any());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null));
    }

    @Test
    void tick_skipsNotDuePoll() {
        when(repo.findAll()).thenReturn(List.of(due()));
        scheduler.tick(tueAt1800.plusMinutes(1));  // falsche Minute
        verify(sender, never()).sendPoll(any(), any(), anyList(), anyBoolean(), any());
        verify(repo, never()).save(any());
    }

    @Test
    void tick_sendFailure_doesNotStampLastSentAt() {
        when(repo.findAll()).thenReturn(List.of(due()));
        doThrow(new RuntimeException("offline")).when(sender).sendPoll(any(), any(), anyList(), anyBoolean(), any());
        scheduler.tick(tueAt1800);
        verify(repo, never()).save(any());
    }

    @Test
    void tick_stampsLastSentMessageId() {
        final WhatsappPoll poll = due();
        when(repo.findAll()).thenReturn(List.of(poll));
        when(sender.sendPoll(any(), any(), anyList(), anyBoolean(), any())).thenReturn("msg-123");

        scheduler.tick(tueAt1800);

        assertThat(poll.getLastSentMessageId()).isEqualTo("msg-123");
        verify(repo).save(poll);
    }

    @Test
    void run_usesBerlinZone_sendsDuePoll() {
        // Regression fuer JVM-Default-Zone-Bug: run() muss Europe/Berlin nutzen, nicht UTC.
        final Clock berlinClock = Clock.fixed(
                ZonedDateTime.of(2026, 7, 14, 18, 0, 0, 0, ZoneId.of("Europe/Berlin")).toInstant(),
                ZoneId.of("Europe/Berlin"));
        final WhatsappPollScheduler berlinScheduler =
                new WhatsappPollScheduler(repo, sender, new PollDueEvaluator(), berlinClock);
        when(repo.findAll()).thenReturn(List.of(due()));

        berlinScheduler.run();

        verify(sender).sendPoll(eq("g@g.us"), eq("Training?"), anyList(), anyBoolean(), any());
        verify(repo).save(argThat(p -> p.getLastSentAt() != null));
    }
}
