package com.softball.application;

import com.softball.domain.model.GameDay;
import com.softball.domain.model.Player;
import com.softball.domain.model.SyncedVote;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SyncedVoteRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VoterAssignmentServiceTest {

    private final PlayerRepository playerRepo = mock(PlayerRepository.class);
    private final SyncedVoteRepository voteRepo = mock(SyncedVoteRepository.class);
    private final TrainingRepository trainingRepo = mock(TrainingRepository.class);
    private final TrainingAttendanceRepository attendanceRepo = mock(TrainingAttendanceRepository.class);
    private final GameDayRepository gameDayRepo = mock(GameDayRepository.class);
    private VoterAssignmentService service;

    private Training training;
    private Player player;

    @BeforeEach
    void setup() {
        service = new VoterAssignmentService(playerRepo, voteRepo, trainingRepo, attendanceRepo, gameDayRepo);
        training = new Training(10L, LocalDate.of(2026, 4, 14), "20:00", "Park");
        player = new Player(5L, "Max", true, null);
        when(voteRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(playerRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void assignExisting_setsWhatsappNameAndBooksOpenYesVote() {
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote openVote = new SyncedVote(10L, "Gast", null, true);
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(openVote));
        when(trainingRepo.findById(10L)).thenReturn(Optional.of(training));
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of());

        final Player result = service.assignExisting("Gast", 5L);

        assertThat(result.getWhatsappName()).isEqualTo("Gast");
        verify(playerRepo).save(player);
        verify(voteRepo).save(openVote);
        assertThat(openVote.getPlayerId()).isEqualTo(5L);
        verify(attendanceRepo).saveAll(argThatList(l ->
                l.size() == 1 && l.get(0).getPlayer().getId().equals(5L) && l.get(0).isPresent()));
    }

    @Test
    void assignNew_createsPlayerWithWhatsappNameAndRematches() {
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of());

        final Player result = service.assignNew("Gast", "Neuer Spieler");

        assertThat(result.getName()).isEqualTo("Neuer Spieler");
        assertThat(result.getWhatsappName()).isEqualTo("Gast");
        verify(playerRepo).save(any(Player.class));
    }

    @Test
    void assignExisting_unknownPlayerId_throwsResourceNotFoundException() {
        when(playerRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.assignExisting("Gast", 99L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(voteRepo, never()).findByVoterNameAndPlayerIdIsNull(any());
    }

    @Test
    void assignNew_blankName_throwsBusinessValidationException() {
        assertThatThrownBy(() -> service.assignNew("Gast", "  "))
                .isInstanceOf(BusinessValidationException.class);

        verify(playerRepo, never()).save(any());
    }

    @Test
    void assignExisting_existingFalseAttendance_isUpgradedNotDuplicated() {
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote openVote = new SyncedVote(10L, "Gast", null, true);
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(openVote));
        when(trainingRepo.findById(10L)).thenReturn(Optional.of(training));
        final TrainingAttendance existingRow = new TrainingAttendance(training, player, false);
        existingRow.setId(42L);
        when(attendanceRepo.findByTrainingId(10L)).thenReturn(List.of(existingRow));

        service.assignExisting("Gast", 5L);

        verify(attendanceRepo).saveAll(argThatList(l ->
                l.size() == 1 && l.get(0).getId() != null && l.get(0).getId() == 42L
                        && l.get(0).getPlayer().getId().equals(5L) && l.get(0).isPresent()));
    }

    @Test
    void assignExisting_existingTrueAttendance_isNotDuplicated() {
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote openVote = new SyncedVote(10L, "Gast", null, true);
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(openVote));
        when(trainingRepo.findById(10L)).thenReturn(Optional.of(training));
        when(attendanceRepo.findByTrainingId(10L))
                .thenReturn(List.of(new TrainingAttendance(training, player, true)));

        service.assignExisting("Gast", 5L);

        verify(attendanceRepo, never()).saveAll(any());
    }

    @Test
    void assignExisting_gameDayVoteAmongOpenVotes_doesNotBookAttendanceOrCrash() {
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote gameDayVote = SyncedVote.forGameDay(7L, "Gast", null, true);
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(gameDayVote));

        service.assignExisting("Gast", 5L);

        assertThat(gameDayVote.getPlayerId()).isEqualTo(5L);
        verify(attendanceRepo, never()).saveAll(any());
        verify(trainingRepo, never()).findById(any());
    }

    @Test
    void assignExisting_openVotePresentFalse_doesNotBookAttendance() {
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote openVote = new SyncedVote(10L, "Gast", null, false);
        when(voteRepo.findByVoterNameAndPlayerIdIsNull("Gast")).thenReturn(List.of(openVote));

        service.assignExisting("Gast", 5L);

        verify(attendanceRepo, never()).saveAll(any());
        assertThat(openVote.getPlayerId()).isEqualTo(5L);
    }

    @Test
    void unknownVoters_joinsTrainingDate() {
        final SyncedVote openVote = new SyncedVote(10L, "Gast", null, true);
        when(voteRepo.findByPlayerIdIsNull()).thenReturn(List.of(openVote));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of(training));
        when(gameDayRepo.findAll()).thenReturn(List.of());

        final List<VoterAssignmentService.UnknownVoter> result = service.unknownVoters();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).voterName()).isEqualTo("Gast");
        assertThat(result.get(0).source()).isEqualTo("TRAINING");
        assertThat(result.get(0).targetId()).isEqualTo(10L);
        assertThat(result.get(0).date()).isEqualTo(LocalDate.of(2026, 4, 14));
    }

    @Test
    void shouldReportGameDayVotersWithSourceAndDate() {
        when(voteRepo.findByPlayerIdIsNull()).thenReturn(List.of(
                SyncedVote.forGameDay(7L, "Sandra W.", null, true)));
        when(gameDayRepo.findAll()).thenReturn(List.of(gameDay(7L, LocalDate.of(2026, 8, 9))));
        when(trainingRepo.findAllByOrderByDateDesc()).thenReturn(List.of());

        final var voters = service.unknownVoters();

        assertThat(voters).singleElement().satisfies(v -> {
            assertThat(v.voterName()).isEqualTo("Sandra W.");
            assertThat(v.source()).isEqualTo("GAME_DAY");
            assertThat(v.targetId()).isEqualTo(7L);
            assertThat(v.date()).isEqualTo(LocalDate.of(2026, 8, 9));
        });
    }

    private static GameDay gameDay(final Long id, final LocalDate date) {
        return new GameDay(id, date, null, null);
    }

    @Test
    void unassign_clearsWhatsappNameAndResetsVotesToUnknown() {
        player.setWhatsappName("Max ⚾");
        when(playerRepo.findById(5L)).thenReturn(Optional.of(player));
        final SyncedVote vote = new SyncedVote(10L, "Max ⚾", 5L, true);
        when(voteRepo.findByPlayerId(5L)).thenReturn(List.of(vote));

        service.unassign(5L);

        // Alias entfernt
        verify(playerRepo).save(org.mockito.ArgumentMatchers.argThat(p -> p.getWhatsappName() == null));
        // zugeordnete Stimme wieder unbekannt (player_id -> null)
        verify(voteRepo).save(org.mockito.ArgumentMatchers.argThat(v -> v.getPlayerId() == null));
    }

    @Test
    void unassign_unknownPlayerThrows() {
        when(playerRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.unassign(99L)).isInstanceOf(ResourceNotFoundException.class);
        verify(voteRepo, never()).save(any());
    }

    // kleine Hilfsmethode, um argThat mit generischem List<TrainingAttendance> lesbar zu halten
    private static List<TrainingAttendance> argThatList(final java.util.function.Predicate<List<TrainingAttendance>> predicate) {
        return org.mockito.ArgumentMatchers.argThat(predicate::test);
    }
}
