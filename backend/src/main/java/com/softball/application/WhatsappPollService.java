package com.softball.application;

import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.CoupledPollTargetResolver;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class WhatsappPollService {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollService.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;
    private final TrainingRepository trainingRepo;
    private final CoupledPollTargetResolver resolver;
    private final Clock clock;

    @Autowired
    public WhatsappPollService(final WhatsappPollRepository repository, final WhatsappSender sender,
                               final TrainingRepository trainingRepo) {
        this(repository, sender, trainingRepo, new CoupledPollTargetResolver(), Clock.system(ZoneId.of("Europe/Berlin")));
    }

    public WhatsappPollService(final WhatsappPollRepository repository, final WhatsappSender sender,
                               final TrainingRepository trainingRepo, final CoupledPollTargetResolver resolver,
                               final Clock clock) {
        this.repository = repository;
        this.sender = sender;
        this.trainingRepo = trainingRepo;
        this.resolver = resolver;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<WhatsappPoll> findAll() { return repository.findAll(); }

    @Transactional(readOnly = true)
    public WhatsappPoll findById(final Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("WhatsappPoll", id));
    }

    @Transactional
    public WhatsappPoll create(final WhatsappPoll poll) {
        poll.setId(null);
        validate(poll);
        log.info("WhatsApp-Poll erstellt: {}", poll.getTitle());
        return repository.save(poll);
    }

    @Transactional
    public WhatsappPoll update(final Long id, final WhatsappPoll incoming) {
        final WhatsappPoll existing = findById(id);
        existing.setGroupId(incoming.getGroupId());
        existing.setGroupName(incoming.getGroupName());
        existing.setTitle(incoming.getTitle());
        existing.setOptions(incoming.getOptions());
        existing.setWeekday(incoming.getWeekday());
        existing.setTime(incoming.getTime());
        existing.setEnabled(incoming.isEnabled());
        existing.setAllowMultipleAnswers(incoming.isAllowMultipleAnswers());
        existing.setMessage(incoming.getMessage());
        validate(existing);
        log.info("WhatsApp-Poll aktualisiert: {} ({})", existing.getTitle(), id);
        return repository.save(existing);
    }

    @Transactional
    public void delete(final Long id) {
        if (!repository.existsById(id)) throw new ResourceNotFoundException("WhatsappPoll", id);
        log.info("WhatsApp-Poll gelöscht: {}", id);
        repository.deleteById(id);
    }

    @Transactional
    public WhatsappPoll addSkipDate(final Long id, final LocalDate date) {
        final WhatsappPoll p = findById(id);
        if (!p.getSkipDates().contains(date)) {
            final List<LocalDate> dates = new ArrayList<>(p.getSkipDates());
            dates.add(date);
            p.setSkipDates(dates);
            repository.save(p);
        }
        return findById(id);
    }

    @Transactional
    public WhatsappPoll removeSkipDate(final Long id, final LocalDate date) {
        final WhatsappPoll p = findById(id);
        final List<LocalDate> dates = new ArrayList<>(p.getSkipDates());
        dates.remove(date);
        p.setSkipDates(dates);
        repository.save(p);
        return findById(id);
    }

    @Transactional
    public void sendNow(final Long id) {
        final WhatsappPoll p = findById(id);
        final String messageId = sender.sendPoll(p.getGroupId(), p.getTitle(), p.getOptions(),
                p.isAllowMultipleAnswers(), p.getMessage());
        // Sende-Metadaten stempeln, sonst findet der Vote-Sync den Poll nicht
        // (braucht lastSentMessageId zum Abfragen + lastSentAt zur Trainings-Auflösung).
        p.setLastSentAt(LocalDateTime.now(clock));
        p.setLastSentMessageId(messageId);
        // An nächstes gültiges Training koppeln, wie es der Scheduler auch tut (für Vote-Sync-Zuordnung).
        final LocalDate today = LocalDate.now(clock);
        final Optional<Training> target = resolver.resolve(trainingRepo.findAllByOrderByDateDesc(),
                p.getWeekday(), p.getSkipDates(), today);
        target.ifPresent(t -> p.setLastSentTrainingId(t.getId()));
        repository.save(p);
        log.info("WhatsApp-Poll manuell gesendet: {} ({}), messageId={}", p.getTitle(), id, messageId);
    }

    @Transactional
    public WhatsappPoll resetLastSent(final Long id) {
        final WhatsappPoll p = findById(id);
        p.setLastSentAt(null);
        repository.save(p);
        log.info("WhatsApp-Poll Sende-Sperre zurückgesetzt: {} ({})", p.getTitle(), id);
        return findById(id);
    }

    public WhatsappAccountStatus status() { return sender.status(); }

    public String qr() { return sender.qr(); }

    public List<WhatsappGroup> groups() { return sender.listGroups(); }

    private void validate(final WhatsappPoll p) {
        if (p.getGroupId() == null || p.getGroupId().isBlank()) {
            throw new BusinessValidationException("Gruppe muss gewählt sein");
        }
        if (p.getWeekday() == null || p.getTime() == null) {
            throw new BusinessValidationException("Wochentag und Uhrzeit müssen gesetzt sein");
        }
        final int optionCount = p.getOptions() != null ? p.getOptions().size() : 0;
        final boolean hasPoll = optionCount >= 2;
        final boolean hasMessage = p.getMessage() != null && !p.getMessage().isBlank();
        // Ein Eintrag ist entweder eine Umfrage, eine reine Nachricht, oder beides.
        if (!hasPoll && !hasMessage) {
            throw new BusinessValidationException("Umfrage (min. 2 Antworten) oder eine Nachricht ist nötig");
        }
        if (optionCount == 1) {
            throw new BusinessValidationException("Eine Umfrage braucht mindestens 2 Antwortoptionen");
        }
        if (optionCount > 12) {
            throw new BusinessValidationException("Maximal 12 Antwortoptionen erlaubt");
        }
        if (hasPoll && (p.getTitle() == null || p.getTitle().isBlank())) {
            throw new BusinessValidationException("Umfrage-Frage (Titel) darf nicht leer sein");
        }
    }
}
