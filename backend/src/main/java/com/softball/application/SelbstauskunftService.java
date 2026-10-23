package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * Was der Angemeldete ueber sich selbst erfaehrt und was die Anmeldung am Account vermerkt.
 * {@code lastLoginAt} gehoert dem Anmelde-Handschlag, {@code lastSeenAt} jedem Aufruf.
 */
@Service
public class SelbstauskunftService {

    private static final Logger log = LoggerFactory.getLogger(SelbstauskunftService.class);

    private final AppUserRepository appUserRepository;
    private final PlayerRepository playerRepository;

    public SelbstauskunftService(final AppUserRepository appUserRepository,
                                 final PlayerRepository playerRepository) {
        this.appUserRepository = appUserRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional
    public void vermerkeAnmeldung(final AppUser user, final Instant jetzt) {
        user.setLastLoginAt(jetzt);
        appUserRepository.save(user);
        log.info("Anmeldung: {}", user.getUsername());
    }

    @Transactional
    public void vermerkeGesehen(final AppUser user, final Instant jetzt) {
        user.setLastSeenAt(jetzt);
        appUserRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Optional<String> spielerName(final AppUser user) {
        if (user.getPlayerId() == null) {
            return Optional.empty();
        }
        return playerRepository.findById(user.getPlayerId()).map(p -> p.getName());
    }
}
