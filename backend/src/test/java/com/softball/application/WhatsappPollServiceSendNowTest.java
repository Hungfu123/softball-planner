package com.softball.application;

import com.softball.domain.model.PollMode;
import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.CoupledPollTargetResolver;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappPollServiceSendNowTest {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    private final WhatsappPollRepository repository = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final TrainingRepository trainingRepo = mock(TrainingRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-20T10:00:00Z"), BERLIN);
    private final WhatsappPollService service =
            new WhatsappPollService(repository, sender, trainingRepo, new CoupledPollTargetResolver(), clock);

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(1L);
        p.setGroupId("123@g.us");
        p.setTitle("Wer kommt zum Training?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setMode(PollMode.TRAINING);
        p.setWeekday(DayOfWeek.MONDAY);
        return p;
    }

    @Test
    void sendNow_stampsMessageIdAndSentAt() {
        final WhatsappPoll p = poll();
        when(repository.findById(1L)).thenReturn(Optional.of(p));
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-42");
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());
        when(repository.save(any(WhatsappPoll.class))).thenAnswer(i -> i.getArgument(0));

        service.sendNow(1L);

        assertThat(p.getLastSentMessageId()).isEqualTo("msg-42");
        assertThat(p.getLastSentAt()).isNotNull();
        verify(repository).save(p);
    }

    @Test
    void sendNow_throwsWhenPollMissing() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.sendNow(9L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendNow_oneOff_isTrueTest_doesNotConsumeSchedule() {
        // Einmalig: "Jetzt testen" schickt die Nachricht, verbraucht aber den geplanten
        // Einmal-Versand NICHT (lastSentAt bleibt null → isDueOneOff feuert später trotzdem).
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(2L);
        p.setGroupId("123@g.us");
        p.setTitle("Grillabend am Samstag?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(LocalDate.of(2026, 7, 25));
        p.setWeekday(null);
        p.setTime(java.time.LocalTime.of(18, 0));

        when(repository.findById(2L)).thenReturn(Optional.of(p));
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-99");

        service.sendNow(2L);

        verify(sender).sendPoll(any(), any(), any(), anyBoolean(), any());
        assertThat(p.getLastSentAt()).isNull();
        assertThat(p.getLastSentMessageId()).isNull();
        assertThat(p.getLastSentTrainingId()).isNull();
        verify(repository, never()).save(any());
    }

    @Test
    void sendNow_gameDay_stampsMessageIdOnly() {
        // Spieltag: Testversand stempelt nur die Message-ID, lastSentAt bleibt leer, damit der
        // geplante Versand (isDueOneOff) am sendDate trotzdem noch feuert (Task 5 liest die
        // Message-ID bereits nach einem Testversand).
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(3L);
        p.setGroupId("123@g.us");
        p.setTitle("CoSe Spieltag in Aachen dabei?");
        p.setOptions(List.of("Ja", "Nein"));
        p.setMode(PollMode.GAME_DAY);
        p.setGameDayId(42L);
        p.setSendDate(LocalDate.of(2026, 8, 2));
        p.setTime(java.time.LocalTime.of(18, 0));

        when(repository.findById(3L)).thenReturn(Optional.of(p));
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-77");
        when(repository.save(any(WhatsappPoll.class))).thenAnswer(i -> i.getArgument(0));

        service.sendNow(3L);

        assertThat(p.getLastSentMessageId()).isEqualTo("msg-77");
        assertThat(p.getLastSentAt()).isNull();
        assertThat(p.getLastSentTrainingId()).isNull();
        verify(repository).save(p);
    }

    @Test
    void sendNow_setsLastSentTrainingId() {
        final WhatsappPoll p = poll();
        final Training training = mock(Training.class);
        when(training.getId()).thenReturn(7L);
        when(training.getDate()).thenReturn(LocalDate.of(2026, 7, 20)); // Monday, matches poll weekday & clock's "today"
        when(training.isCancelled()).thenReturn(false);

        when(repository.findById(1L)).thenReturn(Optional.of(p));
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-42");
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(training));
        when(repository.save(any(WhatsappPoll.class))).thenAnswer(i -> i.getArgument(0));

        service.sendNow(1L);

        assertThat(p.getLastSentTrainingId()).isEqualTo(7L);
        verify(repository).save(p);
    }
}
