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
    public void vermerkeAnmeldung(final String username, final Instant jetzt) {
        appUserRepository.touchLastLogin(username, jetzt);
        log.info("Anmeldung: {}", username);
    }

    @Transactional
    public void vermerkeGesehen(final String username, final Instant jetzt) {
        appUserRepository.touchLastSeen(username, jetzt);
    }

    @Transactional(readOnly = true)
    public Optional<String> spielerName(final AppUser user) {
        if (user.getPlayerId() == null) {
            return Optional.empty();
        }
        return playerRepository.findById(user.getPlayerId()).map(p -> p.getName());
    }
}
