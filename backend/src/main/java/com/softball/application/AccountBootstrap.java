package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Legt auf leerer Datenbank genau einen Superadmin an, damit frische Datenbanken
 * (Entwicklung, Testcontainers, E2E) nicht ohne Zugang sind. Ist schon ein Account
 * da, tut er nichts. Fehlt der Spieler, wird er angelegt.
 */
@Component
public class AccountBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AccountBootstrap.class);

    private final AppUserRepository appUserRepository;
    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapPlayer;
    private final String password;

    public AccountBootstrap(final AppUserRepository appUserRepository,
                            final PlayerRepository playerRepository,
                            final PasswordEncoder passwordEncoder,
                            @Value("${app.auth.bootstrap-player:Hung}") final String bootstrapPlayer,
                            @Value("${app.auth.password}") final String password) {
        this.appUserRepository = appUserRepository;
        this.playerRepository = playerRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapPlayer = bootstrapPlayer;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(final ApplicationArguments args) {
        if (appUserRepository.count() > 0) {
            log.info("Accounts vorhanden, Bootstrap uebersprungen");
            return;
        }
        final Player player = findBootstrapPlayer();

        final AppUser user = new AppUser();
        user.setPlayerId(player.getId());
        user.setUsername(player.getName().toLowerCase(Locale.ROOT));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.SUPERADMIN);
        user.setCreatedAt(Instant.now());
        appUserRepository.save(user);
        log.info("Superadmin '{}' fuer Spieler {} angelegt", user.getUsername(), player.getId());
    }

    /** Bevorzugt einen aktiven Spieler; ein archivierter ist besser als gar kein Zugang. */
    private Player findBootstrapPlayer() {
        final List<Player> matches = playerRepository.findAll().stream()
                .filter(p -> p.getName().equalsIgnoreCase(bootstrapPlayer))
                .toList();
        final Optional<Player> active = matches.stream().filter(p -> !p.isArchived()).findFirst();
        if (active.isPresent()) {
            return active.get();
        }
        if (!matches.isEmpty()) {
            log.warn("Bootstrap-Spieler '{}' ist archiviert, der Superadmin haengt an ihm", bootstrapPlayer);
            return matches.get(0);
        }
        return createPlayer();
    }

    private Player createPlayer() {
        final Player created = playerRepository.save(new Player(bootstrapPlayer));
        log.info("Spieler '{}' fuer den Bootstrap angelegt", bootstrapPlayer);
        return created;
    }
}
