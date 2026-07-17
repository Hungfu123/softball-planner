package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.model.SyncedVote;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SyncedVoteRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Weist einen unbekannten WhatsApp-Wähler (eine {@link SyncedVote} mit {@code playerId == null})
 * einem bestehenden oder neu anzulegenden Spieler zu und re-matcht danach dessen offene Stimmen
 * in Trainings-Anwesenheit. Bucht ausschließlich {@code present=true} — bestehende Anwesenheit
 * wird nie zurückgenommen (gleiche Regel wie {@link PollVoteSyncService}).
 */
@Service
public class VoterAssignmentService {

    public record UnknownVoter(String voterName, Long trainingId, LocalDate trainingDate) {}

    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final TrainingRepository trainingRepo;
    private final TrainingAttendanceRepository attendanceRepo;

    public VoterAssignmentService(final PlayerRepository playerRepo, final SyncedVoteRepository voteRepo,
                                  final TrainingRepository trainingRepo, final TrainingAttendanceRepository attendanceRepo) {
        this.playerRepo = playerRepo;
        this.voteRepo = voteRepo;
        this.trainingRepo = trainingRepo;
        this.attendanceRepo = attendanceRepo;
    }

    @Transactional(readOnly = true)
    public List<UnknownVoter> unknownVoters() {
        final List<SyncedVote> open = voteRepo.findByPlayerIdIsNull();
        final Map<Long, LocalDate> dates = trainingRepo.findAllByOrderByDateDesc().stream()
            .collect(Collectors.toMap(Training::getId, Training::getDate, (a, b) -> a));
        return open.stream()
            .map(v -> new UnknownVoter(v.getVoterName(), v.getTrainingId(), dates.get(v.getTrainingId())))
            .toList();
    }

    @Transactional
    public Player assignExisting(final String voterName, final Long playerId) {
        final Player player = playerRepo.findById(playerId)
            .orElseThrow(() -> new ResourceNotFoundException("Spieler", playerId));
        player.setWhatsappName(voterName);
        final Player saved = playerRepo.save(player);
        rematch(voterName, saved);
        return saved;
    }

    @Transactional
    public Player assignNew(final String voterName, final String playerName) {
        if (playerName == null || playerName.isBlank()) {
            throw new BusinessValidationException("Spielername darf nicht leer sein");
        }
        final Player player = new Player(playerName.trim());
        player.setWhatsappName(voterName);
        final Player saved = playerRepo.save(player);
        rematch(voterName, saved);
        return saved;
    }

    private void rematch(final String voterName, final Player player) {
        final List<SyncedVote> open = voteRepo.findByVoterNameAndPlayerIdIsNull(voterName);
        for (final SyncedVote vote : open) {
            vote.setPlayerId(player.getId());
            voteRepo.save(vote);
            if (vote.isPresent()) {
                bookAttendance(vote.getTrainingId(), player);
            }
        }
    }

    // Buchungsregel wie in PollVoteSyncService: keine bestehende Zeile -> anlegen; present=false ->
    // auf true hochstufen (gleiche id, kein Insert-Konflikt); present=true -> nichts tun (kein Duplikat).
    private void bookAttendance(final Long trainingId, final Player player) {
        final Training training = trainingRepo.findById(trainingId).orElse(null);
        if (training == null) return;

        final TrainingAttendance existingRow = attendanceRepo.findByTrainingId(trainingId).stream()
            .filter(a -> a.getPlayer().getId().equals(player.getId()))
            .findFirst()
            .orElse(null);

        if (existingRow == null) {
            attendanceRepo.saveAll(List.of(new TrainingAttendance(training, player, true)));
        } else if (!existingRow.isPresent()) {
            existingRow.setPresent(true);
            attendanceRepo.saveAll(List.of(existingRow));
        }
    }
}
