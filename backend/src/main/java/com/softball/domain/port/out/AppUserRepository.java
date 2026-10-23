package com.softball.domain.port.out;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import java.util.List;
import java.util.Optional;

public interface AppUserRepository {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByPlayerId(Long playerId);
    List<AppUser> findAll();
    AppUser save(AppUser user);
    void deleteById(Long id);
    long countByRole(Role role);
    boolean existsByUsername(String username);
}
