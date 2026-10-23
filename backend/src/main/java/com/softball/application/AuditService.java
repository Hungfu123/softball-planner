package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditQuery;
import com.softball.domain.model.AuditSpan;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AuditEventRepository;
import com.softball.domain.service.AuditSummarizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.Period;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Historie schreiben, lesen und aufraeumen. Bewusst ohne {@code CurrentUser}: der Name kommt als
 * Argument, damit auch der geplante Aufraeum-Lauf (ausserhalb jeder HTTP-Anfrage) diesen Dienst
 * benutzen kann.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    static final Period AUFBEWAHRUNG = Period.ofMonths(12);

    private final AuditEventRepository repository;
    private final AppUserRepository appUserRepository;
    private final Clock clock;
    private final AuditSummarizer summarizer = new AuditSummarizer();

    public AuditService(final AuditEventRepository repository, final AppUserRepository appUserRepository,
                        final Clock clock) {
        this.repository = repository;
        this.appUserRepository = appUserRepository;
        this.clock = clock;
    }

    /** Schreibt eine Zeile. {@code username} wird als Schnappschuss mitgespeichert. */
    @Transactional
    public AuditEvent record(final String username, final AuditKind kind, final String method, final String path,
                             final String label, final String targetType, final Long targetId, final Integer status) {
        final Long userId = appUserRepository.findByUsername(username).map(AppUser::getId).orElse(null);
        return repository.save(new AuditEvent(null, userId, username, kind, method, path, label, targetType,
                targetId, status, Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    public List<AuditSpan> verlauf(final AuditQuery query) {
        return summarizer.zusammenfassen(repository.find(query));
    }

    @Transactional(readOnly = true)
    public List<AppUser> zuletztGesehen() {
        return appUserRepository.findAll().stream()
                .sorted(Comparator.comparing(AppUser::getLastSeenAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    /** Loescht Zeilen, die aelter als zwoelf Monate sind. */
    @Transactional
    public long raeumeAuf() {
        final Instant grenze = ZonedDateTime.now(clock).minus(AUFBEWAHRUNG).toInstant();
        final long geloescht = repository.deleteOlderThan(grenze);
        if (geloescht > 0) {
            log.info("Historie aufgeraeumt: {} Zeilen vor {} geloescht", geloescht, grenze);
        }
        return geloescht;
    }
}
