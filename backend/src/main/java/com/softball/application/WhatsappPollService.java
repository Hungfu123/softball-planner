package com.softball.application;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class WhatsappPollService {

    private static final Logger log = LoggerFactory.getLogger(WhatsappPollService.class);

    private final WhatsappPollRepository repository;
    private final WhatsappSender sender;

    public WhatsappPollService(final WhatsappPollRepository repository, final WhatsappSender sender) {
        this.repository = repository;
        this.sender = sender;
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

    public void sendNow(final Long id) {
        final WhatsappPoll p = findById(id);
        sender.sendPoll(p.getGroupId(), p.getTitle(), p.getOptions());
    }

    public WhatsappAccountStatus status() { return sender.status(); }

    public String qr() { return sender.qr(); }

    public List<WhatsappGroup> groups() { return sender.listGroups(); }

    private void validate(final WhatsappPoll p) {
        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new BusinessValidationException("Titel darf nicht leer sein");
        }
        if (p.getGroupId() == null || p.getGroupId().isBlank()) {
            throw new BusinessValidationException("Gruppe muss gewählt sein");
        }
        if (p.getOptions() == null || p.getOptions().size() < 2) {
            throw new BusinessValidationException("Mindestens 2 Antwortoptionen nötig");
        }
        if (p.getOptions().size() > 12) {
            throw new BusinessValidationException("Maximal 12 Antwortoptionen erlaubt");
        }
        if (p.getWeekday() == null || p.getTime() == null) {
            throw new BusinessValidationException("Wochentag und Uhrzeit müssen gesetzt sein");
        }
    }
}
