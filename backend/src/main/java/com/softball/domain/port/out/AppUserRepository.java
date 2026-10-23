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
    AppUser save(AppUser user);
    void deleteById(Long id);
    long count();
    long countByRole(Role role);
    boolean existsByUsername(String username);

    /** Schreibt genau die Spalte {@code last_seen_at}, ohne zu lesen: ueberschreibt keine anderen Aenderungen. */
    void touchLastSeen(String username, Instant zeitpunkt);

    /** Schreibt genau die Spalte {@code last_login_at}, ohne zu lesen. */
    void touchLastLogin(String username, Instant zeitpunkt);
}
