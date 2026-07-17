package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.TargetTrainingResolver;
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
 * Trainings-Anwesenheit. Bucht ausschließlich {@code present=true} — bestehende Anwesenheit
 * wird nie zurückgenommen (kein deleteByTrainingId hier, anders als {@link TrainingAttendanceService}).
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
    private final TargetTrainingResolver resolver;
    private final VotePresenceEvaluator evaluator;
    private final Clock clock;

    // Spring-Konstruktor: TargetTrainingResolver/VotePresenceEvaluator sind reine Domain-Klassen
    // (kein @Component, siehe Onion-Architektur) und werden hier wie in LineupService per `new` gebildet.
    @Autowired
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo) {
        this(pollRepo, sender, trainingRepo, playerRepo, voteRepo, attendanceRepo,
             new TargetTrainingResolver(), new VotePresenceEvaluator(), Clock.system(ZoneId.of("Europe/Berlin")));
    }

    // für Tests: expliziter Resolver/Evaluator, Standard-Clock
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final TargetTrainingResolver resolver, final VotePresenceEvaluator evaluator) {
        this(pollRepo, sender, trainingRepo, playerRepo, voteRepo, attendanceRepo, resolver, evaluator,
             Clock.system(ZoneId.of("Europe/Berlin")));
    }

    // vollständiger Konstruktor inkl. Clock (für Tests mit fixem Zeitpunkt)
    public PollVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final PlayerRepository playerRepo,
                               final SyncedVoteRepository voteRepo, final TrainingAttendanceRepository attendanceRepo,
                               final TargetTrainingResolver resolver, final VotePresenceEvaluator evaluator,
                               final Clock clock) {
        this.pollRepo = pollRepo; this.sender = sender; this.trainingRepo = trainingRepo;
        this.playerRepo = playerRepo; this.voteRepo = voteRepo; this.attendanceRepo = attendanceRepo;
        this.resolver = resolver; this.evaluator = evaluator; this.clock = clock;
    }

    @Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")
    public void run() {
        syncAll(LocalDateTime.now(clock));
    }

    @Transactional
    public int syncAll(final LocalDateTime now) {
        return sync(pollRepo.findAll(), now, true);
    }

    @Transactional
    public int syncNow() {
        return sync(pollRepo.findAll(), LocalDateTime.now(clock), false);
    }

    // package-private für Test
    int syncAllUngated(final List<WhatsappPoll> polls) {
        return sync(polls, LocalDateTime.now(clock), false);
    }

    private int sync(final List<WhatsappPoll> polls, final LocalDateTime now, final boolean enforceGate) {
        int written = 0;
        final List<Training> trainings = trainingRepo.findAllByOrderByDateDesc();
        final Map<String, Player> byName = playerRepo.findAll().stream()
            .filter(p -> p.getWhatsappName() != null && !p.getWhatsappName().isBlank())
            .collect(Collectors.toMap(p -> p.getWhatsappName().trim().toLowerCase(), p -> p, (a, b) -> a));

        for (final WhatsappPoll poll : polls) {
            if (!poll.isEnabled() || poll.getLastSentMessageId() == null || poll.getLastSentAt() == null) continue;
            final Optional<Training> target = resolver.resolve(trainings, poll.getLastSentAt());
            if (target.isEmpty()) continue;
            final Training training = target.get();
            if (enforceGate && !evaluator.gateOpen(training.getTime(), now, training.getDate())) continue;
            // Auto-Lauf: pro Versand nur EINMAL syncen (dieser Versand schon gebucht → skip).
            // Der Button (enforceGate=false) ignoriert das und zieht jederzeit erneut.
            if (enforceGate && poll.getLastSentMessageId().equals(poll.getLastSyncedMessageId())) continue;

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
                if (player != null && present && !bookedPlayerIds.contains(playerId)) {
                    final TrainingAttendance existingRow = existingByPlayerId.get(playerId);
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
                }
            }
            if (!toBook.isEmpty()) attendanceRepo.saveAll(toBook);
            log.info("Poll {} → Training {}: {} Stimmen gesynct, {} neu anwesend",
                poll.getId(), training.getId(), votes.size(), toBook.size());
            // Auto-Lauf: diesen Versand als gesynct markieren → feuert nicht erneut.
            // Button (enforceGate=false) markiert NICHT → bleibt beliebig oft wiederholbar.
            if (enforceGate) {
                poll.setLastSyncedMessageId(poll.getLastSentMessageId());
                pollRepo.save(poll);
            }
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
