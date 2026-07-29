package com.softball.application;

import com.softball.domain.model.PollMode;
import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.CoupledPollTargetResolver;
import com.softball.domain.service.PollDueEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Component
public class WhatsappPollScheduler {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollScheduler.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;
    private final PollDueEvaluator evaluator;
    private final TrainingRepository trainingRepo;
    private final CoupledPollTargetResolver resolver;
    private final Clock clock;

    @Autowired
    public WhatsappPollScheduler(final WhatsappPollRepository repository,
                                 final WhatsappSender sender,
                                 final PollDueEvaluator evaluator,
                                 final TrainingRepository trainingRepo) {
        this(repository, sender, evaluator, trainingRepo, new CoupledPollTargetResolver(),
                Clock.system(ZoneId.of("Europe/Berlin")));
    }

    public WhatsappPollScheduler(final WhatsappPollRepository repository,
                                 final WhatsappSender sender,
                                 final PollDueEvaluator evaluator,
                                 final TrainingRepository trainingRepo,
                                 final CoupledPollTargetResolver resolver,
                                 final Clock clock) {
        this.repository = repository;
        this.sender = sender;
        this.evaluator = evaluator;
        this.trainingRepo = trainingRepo;
        this.resolver = resolver;
        this.clock = clock;
    }

    // Jede Minute zur Sekunde 0
    @Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")
    public void run() {
        tick(LocalDateTime.now(clock));
    }

    public void tick(final LocalDateTime now) {
        final List<Training> trainings = trainingRepo.findAllByOrderByDateDesc();
        for (final WhatsappPoll poll : repository.findAll()) {
            if (poll.getMode() == PollMode.TRAINING) {
                final Optional<Training> target = resolver.resolve(trainings, poll.getWeekday(), poll.getSkipDates(), now.toLocalDate());
                if (target.isEmpty() || !evaluator.isDue(poll, target.get(), now)) continue;
                send(poll, now, target.get().getId());
            } else {
                if (!evaluator.isDueOneOff(poll, now)) continue;
                send(poll, now, null);
            }
        }
    }

    private void send(final WhatsappPoll poll, final LocalDateTime now, final Long trainingId) {
        try {
            final String messageId = sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions(),
                    poll.isAllowMultipleAnswers(), poll.getMessage());
            poll.setLastSentAt(now);
            poll.setLastSentMessageId(messageId);
            poll.setLastSentTrainingId(trainingId);
            repository.save(poll);
            log.info("WhatsApp-Poll gesendet: {} ({}) -> {}", poll.getTitle(), poll.getId(),
                    trainingId != null ? "Training " + trainingId : "einmalig");
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll fehlgeschlagen: {} ({}): {}", poll.getTitle(), poll.getId(), e.getMessage());
            // lastSentAt NICHT stempeln → nächster Tick im selben Minutenfenster kann erneut versuchen
        }
    }
}
