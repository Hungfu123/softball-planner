package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditQuery;
import com.softball.domain.model.AuditSpan;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AuditEventRepository;
import com.softball.domain.port.out.PlayerRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private final PlayerRepository playerRepository;
    private final Clock clock;
    private final AuditSummarizer summarizer = new AuditSummarizer();

    public AuditService(final AuditEventRepository repository, final AppUserRepository appUserRepository,
                        final PlayerRepository playerRepository, final Clock clock) {
        this.repository = repository;
        this.appUserRepository = appUserRepository;
        this.playerRepository = playerRepository;
        this.clock = clock;
    }

    /** Eine Zeile der Historie samt Spielername — {@code playerName} ist null, wenn er nicht auffindbar ist. */
    public record Zeile(AuditSpan span, String playerName) {}

    /** Ein Account samt Spielername, fuer die Liste „zuletzt gesehen". */
    public record Gesehen(AppUser account, String playerName) {}

    /** Schreibt eine Zeile. {@code username} wird als Schnappschuss mitgespeichert. */
    @Transactional
    public AuditEvent record(final String username, final AuditKind kind, final String method, final String path,
                             final String label, final String targetType, final Long targetId, final Integer status) {
        final Long userId = appUserRepository.findByUsername(username).map(AppUser::getId).orElse(null);
        return repository.save(new AuditEvent(null, userId, username, kind, method, path, label, targetType,
                targetId, status, Instant.now(clock)));
    }

    /**
     * Der Verlauf, jede Zeile mit dem Spieler dahinter. Aufgeloest wird ueber die {@code userId},
     * nicht ueber den Benutzernamen: der ist im Ereignis ein Schnappschuss, und wer sich umbenennt,
     * stuende sonst unter zwei Namen ohne erkennbaren Zusammenhang. Genau das soll die Spalte
     * verhindern. Geloeschte Accounts haben keine userId mehr und bleiben ohne Spielernamen.
     */
    @Transactional(readOnly = true)
    public List<Zeile> verlauf(final AuditQuery query) {
        final Map<Long, String> jeUserId = spielerNamenJeUserId();
        return summarizer.zusammenfassen(repository.find(query)).stream()
                .map(s -> new Zeile(s, s.userId() == null ? null : jeUserId.get(s.userId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Gesehen> zuletztGesehen() {
        final Map<Long, String> jePlayerId = spielerNamen();
        return appUserRepository.findAll().stream()
                .sorted(Comparator.comparing(AppUser::getLastSeenAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(a -> new Gesehen(a, a.getPlayerId() == null ? null : jePlayerId.get(a.getPlayerId())))
                .toList();
    }

    private Map<Long, String> spielerNamen() {
        final Map<Long, String> namen = new HashMap<>();
        for (final Player p : playerRepository.findAll()) {
            namen.put(p.getId(), p.getName());
        }
        return namen;
    }

    private Map<Long, String> spielerNamenJeUserId() {
        final Map<Long, String> jePlayerId = spielerNamen();
        final Map<Long, String> jeUserId = new HashMap<>();
        for (final AppUser a : appUserRepository.findAll()) {
            if (a.getPlayerId() != null) {
                jeUserId.put(a.getId(), jePlayerId.get(a.getPlayerId()));
            }
        }
        return jeUserId;
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
