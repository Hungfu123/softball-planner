package com.softball.domain.port.out;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AppUserRepository {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByPlayerId(Long playerId);
    List<AppUser> findAll();
    Optional<AppUser> findById(Long id);

    /**
     * Legt einen neuen Account an. Bestehende Accounts werden hier nicht geschrieben: ein
     * Ganzzeilen-Schreiben mit altem Stand dreht gleichzeitige Aenderungen anderer Aufrufer zurueck
     * (Sperre, Rolle, Passwort). Aenderungen gehen ueber die gezielten {@code update*}-Methoden.
     *
     * @throws IllegalArgumentException wenn der Account schon eine Id traegt
     */
    AppUser save(AppUser user);
    void deleteById(Long id);
    long count();
    long countByRole(Role role);

    /** Accounts der Rolle, die sich anmelden koennen, also nicht gesperrt sind. */
    long countUnlockedByRole(Role role);
    boolean existsByUsername(String username);

    /** Schreibt genau die Spalte {@code last_seen_at}, ohne zu lesen: ueberschreibt keine anderen Aenderungen. */
    void touchLastSeen(String username, Instant zeitpunkt);

    /** Schreibt genau die Spalte {@code last_login_at}, ohne zu lesen. */
    void touchLastLogin(String username, Instant zeitpunkt);

    // Je Aenderung genau die eigenen Spalten, ohne vorheriges Lesen. Zwei Aufrufer, die
    // verschiedene Felder aendern, behalten beide ihre Aenderung.

    void updateLocked(Long id, boolean locked);

    void updateRole(Long id, Role role);

    void updateMayScore(Long id, boolean mayScore);

    /** Hash und {@code password_changed} gehoeren zusammen: wer das Passwort setzt, sagt auch, ob der Nutzer es gewaehlt hat. */
    void updatePassword(Long id, String passwordHash, boolean passwordChanged);

    void updateUsername(Long id, String username);
}
