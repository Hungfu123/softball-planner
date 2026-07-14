package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.PollDueEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class WhatsappPollScheduler {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollScheduler.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;
    private final PollDueEvaluator evaluator;
    private final Clock clock;

    @Autowired
    public WhatsappPollScheduler(final WhatsappPollRepository repository,
                                 final WhatsappSender sender,
                                 final PollDueEvaluator evaluator) {
        this(repository, sender, evaluator, Clock.system(ZoneId.of("Europe/Berlin")));
    }

    public WhatsappPollScheduler(final WhatsappPollRepository repository,
                                 final WhatsappSender sender,
                                 final PollDueEvaluator evaluator,
                                 final Clock clock) {
        this.repository = repository;
        this.sender = sender;
        this.evaluator = evaluator;
        this.clock = clock;
    }

    // Jede Minute zur Sekunde 0
    @Scheduled(cron = "0 * * * * *", zone = "Europe/Berlin")
    public void run() {
        tick(LocalDateTime.now(clock));
    }

    public void tick(final LocalDateTime now) {
        for (final WhatsappPoll poll : repository.findAll()) {
            if (!evaluator.isDue(poll, now)) continue;
            try {
                sender.sendPoll(poll.getGroupId(), poll.getTitle(), poll.getOptions(), poll.isAllowMultipleAnswers(), poll.getMessage());
                poll.setLastSentAt(now);
                repository.save(poll);
                log.info("Geplanter WhatsApp-Poll gesendet: {} ({})", poll.getTitle(), poll.getId());
            } catch (final Exception e) {
                log.warn("Geplanter WhatsApp-Poll fehlgeschlagen: {} ({}): {}",
                        poll.getTitle(), poll.getId(), e.getMessage());
                // lastSentAt NICHT stempeln → nächster Tick im selben Minutenfenster kann erneut versuchen
            }
        }
    }
}
