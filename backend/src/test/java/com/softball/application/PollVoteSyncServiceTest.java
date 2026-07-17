package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.TargetTrainingResolver;
import com.softball.domain.service.VotePresenceEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PollVoteSyncServiceTest {

    private final WhatsappPollRepository pollRepo = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final TrainingRepository trainingRepo = mock(TrainingRepository.class);
    private final PlayerRepository playerRepo = mock(PlayerRepository.class);
    private final SyncedVoteRepository voteRepo = mock(SyncedVoteRepository.class);
    private final TrainingAttendanceRepository attendanceRepo = mock(TrainingAttendanceRepository.class);
    private PollVoteSyncService service;

    private final LocalDateTime now = LocalDateTime.of(2026, 4, 14, 20, 0); // Di 20:00
    private Training training;
    private WhatsappPoll poll;

    @BeforeEach
    void setup() {
        service = new PollVoteSyncService(pollRepo, sender, trainingRepo, playerRepo, voteRepo,
                attendanceRepo, new TargetTrainingResolver(), new VotePresenceEvaluator());
        training = new Training(10L, LocalDate.of(2026, 4, 14), "20:00", "Park");
        poll = new WhatsappPoll();
        poll.setId(1L); poll.setEnabled(true);
        poll.setLastSentMessageId("msg-1");
        poll.setLastSentAt(LocalDateTime.of(2026, 4, 13, 20, 0)); // Mo
        when(pollRepo.findAll()).thenReturn(List.of(poll));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(training));
        when(voteRepo.findByTrainingIdAndVoterName(anyLong(), anyString())).thenReturn(Optional.empty());
        when(voteRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of());
    }

    @Test
    void knownYesVoterBooksAttendance() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));

        final int written = service.syncAll(now);

        assertThat(written).isEqualTo(1);
        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && v.getPlayerId() == 5L && v.isPresent()));
        verify(attendanceRepo).saveAll(argThat((List<TrainingAttendance> l) ->
            l.size() == 1 && l.get(0).getPlayer().getId() == 5L && l.get(0).isPresent()));
    }

    @Test
    void unknownVoterStoredWithoutPlayer() {
        when(playerRepo.findAll()).thenReturn(List.of());
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Gast", List.of("Ja"))));

        service.syncAll(now);

        verify(voteRepo).save(argThat(v -> v.getPlayerId() == null && v.isPresent()));
        verify(attendanceRepo, never()).saveAll(any());
    }

    @Test
    void knownNoVoterDoesNotBookAttendance() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Nein"))));

        service.syncAll(now);

        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && !v.isPresent()));
        verify(attendanceRepo, never()).saveAll(any());
    }

    @Test
    void gateClosedDoesNothing() {
        when(sender.fetchVotes(any())).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));
        final int written = service.syncAll(LocalDateTime.of(2026, 4, 14, 19, 0)); // vor 20:00
        assertThat(written).isZero();
        verify(voteRepo, never()).save(any());
        verify(attendanceRepo, never()).saveAll(any());
    }

    @Test
    void syncNowIgnoresGate() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));

        // syncNow nutzt intern "jetzt"; Gate wird ignoriert → auch außerhalb Trainingszeit gebucht.
        // Da syncNow() ohne Argument arbeitet, hier stattdessen die interne gate-freie Methode testen.
        service.syncAllUngated(List.of(poll));
        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && v.isPresent()));
        verify(attendanceRepo).saveAll(any());
    }

    @Test
    void noTargetTrainingSkips() {
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());
        when(playerRepo.findAll()).thenReturn(List.of());

        final int written = service.syncAll(now);

        assertThat(written).isZero();
        verify(sender, never()).fetchVotes(any());
        verify(voteRepo, never()).save(any());
    }

    @Test
    void existingPresentAttendanceIsNotResetToFalse() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        // Spieler hat bereits eine anwesende Buchung (z.B. manuell gesetzt)
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of(new TrainingAttendance(training, max, true)));
        // Stimme sagt jetzt "Nein" -> darf bestehende Anwesenheit NICHT auf false zurücksetzen
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Nein"))));

        service.syncAll(now);

        verify(attendanceRepo, never()).saveAll(any());
        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && !v.isPresent()));
    }

    @Test
    void nullOrBlankVoterNameIsSkipped() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
                new WhatsappVote(null, List.of("Ja")),
                new WhatsappVote("  ", List.of("Ja")),
                new WhatsappVote("Max ⚾", List.of("Ja"))));

        final int written = service.syncAll(now);

        assertThat(written).isEqualTo(1);
        verify(voteRepo, times(1)).save(any());
        verify(voteRepo).save(argThat(v -> v.getPlayerId() != null && v.getPlayerId() == 5L && v.isPresent()));
        verify(attendanceRepo).saveAll(argThat((List<TrainingAttendance> l) ->
            l.size() == 1 && l.get(0).getPlayer().getId() == 5L && l.get(0).isPresent()));
    }

    @Test
    void existingFalseAttendanceIsUpgradedToTrueSameId() {
        final Player max = new Player(5L, "Max", true, null); max.setWhatsappName("Max ⚾");
        when(playerRepo.findAll()).thenReturn(List.of(max));
        // Spieler hat bereits eine Buchung mit present=false (z.B. manuell abgemeldet)
        final TrainingAttendance existingRow = new TrainingAttendance(training, max, false);
        existingRow.setId(42L);
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of(existingRow));
        // Stimme sagt jetzt "Ja" -> bestehende Zeile muss auf true hochgestuft werden (gleiche id -> Update, kein Insert)
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Max ⚾", List.of("Ja"))));

        service.syncAll(now);

        verify(attendanceRepo).saveAll(argThat((List<TrainingAttendance> l) ->
            l.size() == 1 && l.get(0).getId() != null && l.get(0).getId() == 42L
                && l.get(0).getPlayer().getId() == 5L && l.get(0).isPresent()));
    }
}
