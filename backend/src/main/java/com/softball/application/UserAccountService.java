package com.softball.application;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Admin verwaltet <em>fremde</em> Accounts: anlegen, zuruecksetzen, Rolle, Scorer-Recht, sperren,
 * loeschen. Den eigenen Account aendert {@link AccountSelfService}; die beiden sind getrennt, damit
 * kein Dienst entsteht, der beides kann.
 * <p>
 * Geaendert wird nur ueber gezielte Spalten-Updates des Ports, nie per Ganzzeilen-{@code save}: ein
 * Nutzer, der gleichzeitig sein Passwort aendert, wuerde sonst eine Sperre zuruecknehmen (oder umgekehrt).
 * Die Methoden, die {@link DataIntegrityViolationException} fangen, sind bewusst nicht
 * {@code @Transactional}: ein gefangener Fehler in einer umschliessenden Transaktion
 * liesse diese beim Commit trotzdem scheitern.
 */
@Service
public class UserAccountService {

    private static final Logger log = LoggerFactory.getLogger(UserAccountService.class);

    private final AppUserRepository appUserRepository;
    private final PlayerRepository playerRepository;
    private final UsernamePolicy usernamePolicy;
    private final VerteiltesPasswort verteiltesPasswort;
    private final SuperadminGuard superadminGuard;

    public UserAccountService(final AppUserRepository appUserRepository, final PlayerRepository playerRepository,
                              final UsernamePolicy usernamePolicy, final VerteiltesPasswort verteiltesPasswort,
                              final SuperadminGuard superadminGuard) {
        this.appUserRepository = appUserRepository;
        this.playerRepository = playerRepository;
        this.usernamePolicy = usernamePolicy;
        this.verteiltesPasswort = verteiltesPasswort;
        this.superadminGuard = superadminGuard;
    }

    public record Konto(AppUser account, String playerName) {}

    public record Angelegt(Long accountId, Long playerId, String playerName, String username) {}

    public record Uebersprungen(Long playerId, String playerName, String grund) {}

    public record MassenanlageErgebnis(List<Angelegt> angelegt, List<Uebersprungen> uebersprungen) {}

    @Transactional(readOnly = true)
    public List<Konto> findAll() {
        final Map<Long, String> namen = playerRepository.findAll().stream()
                .collect(Collectors.toMap(Player::getId, Player::getName));
        return appUserRepository.findAll().stream()
                .map(a -> new Konto(a, namen.get(a.getPlayerId())))
                .toList();
    }

    public Konto create(final Long playerId) {
        final Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));
        if (player.isArchived()) {
            throw new BusinessValidationException(
                    "Für den archivierten Spieler '" + player.getName() + "' kann kein Account angelegt werden.");
        }
        final AppUser saved = anlegen(player);
        return new Konto(saved, player.getName());
    }

    /**
     * Legt Accounts fuer alle aktiven Spieler ohne Account an. Kollidierende Namen werden
     * uebersprungen und gemeldet, nicht entschaerft: {@code hung2} ist schlechter als eine Rueckfrage.
     */
    public MassenanlageErgebnis createForAll() {
        final Set<Long> mitAccount = appUserRepository.findAll().stream()
                .map(AppUser::getPlayerId).collect(Collectors.toCollection(HashSet::new));
        final List<Angelegt> angelegt = new ArrayList<>();
        final List<Uebersprungen> uebersprungen = new ArrayList<>();

        for (final Player player : playerRepository.findAll()) {
            if (mitAccount.contains(player.getId())) {
                continue;
            }
            if (player.isArchived()) {
                uebersprungen.add(new Uebersprungen(player.getId(), player.getName(), "archiviert"));
                continue;
            }
            try {
                final AppUser saved = anlegen(player);
                angelegt.add(new Angelegt(saved.getId(), player.getId(), player.getName(), saved.getUsername()));
            } catch (final BusinessValidationException e) {
                uebersprungen.add(new Uebersprungen(player.getId(), player.getName(), e.getMessage()));
            }
        }
        log.info("Massenanlage: {} Accounts angelegt, {} Spieler uebersprungen", angelegt.size(), uebersprungen.size());
        return new MassenanlageErgebnis(angelegt, uebersprungen);
    }

    public Konto resetPassword(final Long id, final AppUser actor) {
        final AppUser target = laden(id);
        pruefeDarfAendern(target, actor);
        appUserRepository.updatePassword(id, verteiltesPasswort.hash(), false);
        log.info("Passwort von Account {} ('{}') auf das verteilte zurueckgesetzt, durch {}",
                id, target.getUsername(), actor.getUsername());
        return konto(id);
    }

    public Konto setRole(final Long id, final Role role, final AppUser actor) {
        final AppUser target = laden(id);
        if (target.getRole() == Role.SUPERADMIN && role != Role.SUPERADMIN) {
            if (target.getId().equals(actor.getId())) {
                throw new BusinessValidationException("Ein Superadmin kann sich nicht selbst herabstufen.");
            }
            superadminGuard.pruefeNichtLetzter(target,
                    "Der letzte Superadmin kann nicht herabgestuft werden: danach käme niemand mehr in die Verwaltung.");
        }
        appUserRepository.updateRole(id, role);
        log.info("Rolle von Account {} ('{}') von {} auf {} gesetzt, durch {}",
                id, target.getUsername(), target.getRole(), role, actor.getUsername());
        return konto(id);
    }

    public Konto setMayScore(final Long id, final boolean mayScore, final AppUser actor) {
        final AppUser target = laden(id);
        pruefeDarfAendern(target, actor);
        appUserRepository.updateMayScore(id, mayScore);
        log.info("Scorer-Recht von Account {} ('{}') auf {} gesetzt, durch {}",
                id, target.getUsername(), mayScore, actor.getUsername());
        return konto(id);
    }

    public Konto setLocked(final Long id, final boolean locked, final AppUser actor) {
        final AppUser target = laden(id);
        pruefeDarfAendern(target, actor);
        if (locked) {
            if (target.getId().equals(actor.getId())) {
                throw new BusinessValidationException("Du kannst deinen eigenen Account nicht sperren.");
            }
            superadminGuard.pruefeNichtSperrbar(target,
                    "Ein Superadmin kann nie gesperrt werden. Wer ihn loswerden will, stuft ihn erst herab "
                            + "(dafür braucht es vorher einen anderen Superadmin).");
        }
        appUserRepository.updateLocked(id, locked);
        log.info("Account {} ('{}') {}, durch {}", id, target.getUsername(),
                locked ? "gesperrt" : "entsperrt", actor.getUsername());
        return konto(id);
    }

    public void delete(final Long id, final AppUser actor) {
        final AppUser target = laden(id);
        pruefeDarfAendern(target, actor);
        if (target.getId().equals(actor.getId())) {
            throw new BusinessValidationException("Du kannst deinen eigenen Account nicht löschen.");
        }
        superadminGuard.pruefeNichtLetzter(target,
                "Der letzte Superadmin kann nicht gelöscht werden: danach käme niemand mehr in die Verwaltung.");
        appUserRepository.deleteById(id);
        log.info("Account {} ('{}') geloescht, durch {}", id, target.getUsername(), actor.getUsername());
    }

    private AppUser anlegen(final Player player) {
        if (appUserRepository.findByPlayerId(player.getId()).isPresent()) {
            throw new BusinessValidationException("Spieler '" + player.getName() + "' hat schon einen Account.");
        }
        final String username = usernamePolicy.normalisiere(player.getName());
        usernamePolicy.pruefeFrei(username, null);

        final AppUser user = new AppUser();
        user.setPlayerId(player.getId());
        user.setUsername(username);
        user.setPasswordHash(verteiltesPasswort.hash());
        user.setRole(Role.PLAYER);
        user.setCreatedAt(Instant.now());
        try {
            final AppUser saved = appUserRepository.save(user);
            log.info("Account '{}' fuer Spieler {} angelegt", username, player.getId());
            return saved;
        } catch (final DataIntegrityViolationException e) {
            throw usernamePolicy.uebersetze(e, username);
        }
    }

    /**
     * Ein Admin darf Superadmins nicht anfassen: er koennte deren Passwort auf das verteilte
     * zuruecksetzen, das jeder Spieler kennt, und sich damit zum Superadmin machen.
     */
    private void pruefeDarfAendern(final AppUser target, final AppUser actor) {
        if (target.getRole() == Role.SUPERADMIN && actor.getRole() != Role.SUPERADMIN) {
            throw new AccessDeniedException("Superadmin-Accounts darf nur ein Superadmin ändern");
        }
    }

    private AppUser laden(final Long id) {
        return appUserRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }

    private Konto konto(final Long id) {
        final AppUser frisch = laden(id);
        final String name = playerRepository.findById(frisch.getPlayerId()).map(Player::getName).orElse(null);
        return new Konto(frisch, name);
    }
}
