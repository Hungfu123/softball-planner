package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.VotePresenceEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Zieht Stimmen aus versendeten WhatsApp-Umfragen ("Trainings-Poll") und bucht sie als
 * Trainings-Anwesenheit.
 * <ul>
 *   <li>Auto-Sync (Scheduler, {@link #syncAll}): additiv — bucht nur {@code present=true},
 *       nimmt bestehende Anwesenheit nie zurück (schützt manuelle Korrekturen nach dem Training).</li>
 *   <li>Manueller Sync ({@link #syncNow}, "Jetzt syncen"-Button): spiegelt den aktuellen
 *       Voter-Stand — nimmt Anwesenheit von Wählern zurück, die nicht mehr "Ja" gestimmt haben.
 *       Nicht-Wähler bleiben in beiden Fällen unberührt.</li>
 * </ul>
 * Kein pauschales deleteByTrainingId (anders als {@link TrainingAttendanceService}).
 */
@Service
public class PollVoteSyncService {

    private static final Logger log = LoggerFactory.getLogger(PollVoteSyncService.class);

    private final WhatsappPollRepository pollRepo;
    private final WhatsappSender sender;
    private final TrainingRepository trainingRepo;
    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final TrainingAttendanceRepository attendanceRepo;
    private final VotePresenceEvaluator evaluator;
    private final Clock clock;

    // Spring-Konstruktor: VotePresenceEvaluator ist eine reine Domain-Klasse
    // (kein @Component, siehe Onion-Architektur) und wird hier wie in LineupService per `new` gebildet.
    @Autowired
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo) {
        this(pollRepo, sender, trainingRepo, playerRepo, voteRepo, attendanceRepo,
             new VotePresenceEvaluator(), Clock.system(ZoneId.of("Europe/Berlin")));
    }

    // für Tests: expliziter Evaluator, Standard-Clock
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final VotePresenceEvaluator evaluator) {
        this(pollRepo, sender, trainingRepo, playerRepo, voteRepo, attendanceRepo, evaluator,
             Clock.system(ZoneId.of("Europe/Berlin")));
    }

    // vollständiger Konstruktor inkl. Clock (für Tests mit fixem Zeitpunkt)
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final VotePresenceEvaluator evaluator, final Clock clock) {
        this.pollRepo = pollRepo; this.sender = sender; this.trainingRepo = trainingRepo;
        this.playerRepo = playerRepo; this.voteRepo = voteRepo; this.attendanceRepo = attendanceRepo;
        this.evaluator = evaluator; this.clock = clock;
    }

    @Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")
    public void run() {
        syncAll(LocalDateTime.now(clock));
    }

    @Transactional
    public int syncAll(final LocalDateTime now) {
        // Automatischer Scheduler-Lauf: additiv (nie zurücknehmen), damit späte Vote-Änderungen
        // und manuelle Korrekturen nach dem Training nicht überschrieben werden.
        return sync(pollRepo.findAll(), now, true, false);
    }

    @Transactional
    public int syncNow() {
        // Manueller "Jetzt syncen"-Button: spiegelt den aktuellen Voter-Stand (Ja -> anwesend,
        // von Ja weg -> Haken zurücknehmen). Nicht-Wähler bleiben unberührt.
        return sync(pollRepo.findAll(), LocalDateTime.now(clock), false, true);
    }

    // package-private für Test
    int syncAllUngated(final List<WhatsappPoll> polls) {
        return sync(polls, LocalDateTime.now(clock), false, false);
    }

    private int sync(final List<WhatsappPoll> polls, final LocalDateTime now, final boolean enforceGate, final boolean mirror) {
        int written = 0;
        final Map<String, Player> byName = playerRepo.findAll().stream()
            .filter(p -> p.getWhatsappName() != null && !p.getWhatsappName().isBlank())
            .collect(Collectors.toMap(p -> p.getWhatsappName().trim().toLowerCase(), p -> p, (a, b) -> a));

        for (final WhatsappPoll poll : polls) {
            if (!poll.isEnabled() || poll.getLastSentMessageId() == null || poll.getLastSentTrainingId() == null) continue;
            final Training training = trainingRepo.findById(poll.getLastSentTrainingId()).orElse(null);
            if (training == null || training.isCancelled()) continue;
            if (enforceGate && !evaluator.gateOpen(training.getTime(), now, training.getDate(), 1)) continue;

            final List<WhatsappVote> votes = sender.fetchVotes(poll.getLastSentMessageId());
            if (votes.isEmpty()) continue;

            final List<TrainingAttendance> existing = attendanceRepo.findByTrainingId(training.getId());
            final Map<Long, TrainingAttendance> existingByPlayerId = existing.stream()
                .collect(Collectors.toMap(a -> a.getPlayer().getId(), a -> a, (a, b) -> a));
            final Set<Long> bookedPlayerIds = new HashSet<>();
            final List<TrainingAttendance> toBook = new ArrayList<>();

            for (final WhatsappVote vote : votes) {
                if (vote.voterName() == null || vote.voterName().isBlank()) continue;
                final boolean present = evaluator.isPresent(vote.options());
                final Player player = byName.get(vote.voterName().trim().toLowerCase());
                final Long playerId = player != null ? player.getId() : null;
                upsertVote(training.getId(), vote.voterName(), playerId, present);
                written++;
                if (player != null && !bookedPlayerIds.contains(playerId)) {
                    final TrainingAttendance existingRow = existingByPlayerId.get(playerId);
                    if (present) {
                        if (existingRow == null) {
                            // keine Buchung vorhanden -> neue Anwesenheit anlegen
                            toBook.add(new TrainingAttendance(training, player, true));
                            bookedPlayerIds.add(playerId);
                        } else if (!existingRow.isPresent()) {
                            // vorhandene Buchung false -> auf true hochstufen (id bleibt erhalten, kein Insert-Konflikt)
                            existingRow.setPresent(true);
                            toBook.add(existingRow);
                            bookedPlayerIds.add(playerId);
                        }
                        // existingRow bereits present=true -> nichts zu tun, kein Duplikat
                    } else if (mirror && existingRow != null && existingRow.isPresent()) {
                        // Manueller Sync spiegelt den aktuellen Stand: Vote ist nicht mehr "Ja"
                        // -> zuvor gebuchte Anwesenheit dieses Wählers zurücknehmen.
                        existingRow.setPresent(false);
                        toBook.add(existingRow);
                        bookedPlayerIds.add(playerId);
                    }
                }
            }
            if (!toBook.isEmpty()) attendanceRepo.saveAll(toBook);
            log.info("Poll {} → Training {}: {} Stimmen gesynct, {} neu anwesend",
                poll.getId(), training.getId(), votes.size(), toBook.size());
        }
        return written;
    }

    private void upsertVote(final Long trainingId, final String voterName, final Long playerId, final boolean present) {
        final SyncedVote vote = voteRepo.findByTrainingIdAndVoterName(trainingId, voterName)
            .orElseGet(() -> new SyncedVote(trainingId, voterName, playerId, present));
        vote.setPlayerId(playerId);
        vote.setPresent(present);
        voteRepo.save(vote);
    }
}
