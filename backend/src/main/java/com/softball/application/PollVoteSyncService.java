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
            final Optional<Training> target = resolver.resolve(trainings, poll.getLastSentAt().toLocalDate());
            if (target.isEmpty()) continue;
            final Training training = target.get();
            if (enforceGate && !evaluator.gateOpen(training.getTime(), now, training.getDate())) continue;

            final List<WhatsappVote> votes = sender.fetchVotes(poll.getLastSentMessageId());
            if (votes.isEmpty()) continue;

            final List<TrainingAttendance> existing = attendanceRepo.findByTrainingId(training.getId());
            final Set<Long> presentPlayerIds = existing.stream()
                .filter(TrainingAttendance::isPresent)
                .map(a -> a.getPlayer().getId()).collect(Collectors.toSet());
            final List<TrainingAttendance> toBook = new ArrayList<>();

            for (final WhatsappVote vote : votes) {
                final boolean present = evaluator.isPresent(vote.options());
                final Player player = vote.voterName() == null ? null
                    : byName.get(vote.voterName().trim().toLowerCase());
                final Long playerId = player != null ? player.getId() : null;
                upsertVote(training.getId(), vote.voterName(), playerId, present);
                written++;
                if (player != null && present && !presentPlayerIds.contains(playerId)) {
                    toBook.add(new TrainingAttendance(training, player, true));
                    presentPlayerIds.add(playerId);
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
