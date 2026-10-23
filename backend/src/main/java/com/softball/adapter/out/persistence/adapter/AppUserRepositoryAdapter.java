package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.AppUserMapper;
import com.softball.adapter.out.persistence.repository.SpringAppUserRepository;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Component
public class AppUserRepositoryAdapter implements AppUserRepository {

    private final SpringAppUserRepository repo;
    private final AppUserMapper mapper;

    public AppUserRepositoryAdapter(final SpringAppUserRepository repo, final AppUserMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public Optional<AppUser> findByUsername(final String username) {
        return repo.findByUsernameIgnoreCase(username).map(mapper::toDomain);
    }

    @Override
    public Optional<AppUser> findByPlayerId(final Long playerId) {
        return repo.findByPlayerId(playerId).map(mapper::toDomain);
    }

    @Override
    public List<AppUser> findAll() {
        return repo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<AppUser> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public AppUser save(final AppUser user) {
        if (user.getId() != null) {
            throw new IllegalArgumentException(
                "save legt nur an; bestehende Accounts werden ueber die gezielten update*-Methoden geaendert");
        }
        return mapper.toDomain(repo.save(mapper.toEntity(user)));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public long count() {
        return repo.count();
    }

    @Override
    public long countByRole(final Role role) {
        return repo.countByRole(role);
    }

    @Override
    public long countUnlockedByRole(final Role role) {
        return repo.countByRoleAndLocked(role, false);
    }

    @Override
    public boolean existsByUsername(final String username) {
        return repo.existsByUsernameIgnoreCase(username);
    }

    @Override
    @Transactional
    public void touchLastSeen(final String username, final Instant zeitpunkt) {
        repo.updateLastSeenAt(username, zeitpunkt);
    }

    @Override
    @Transactional
    public void touchLastLogin(final String username, final Instant zeitpunkt) {
        repo.updateLastLoginAt(username, zeitpunkt);
    }

    @Override
    @Transactional
    public void updateLocked(final Long id, final boolean locked) {
        repo.updateLocked(id, locked);
    }

    @Override
    @Transactional
    public void updateRole(final Long id, final Role role) {
        repo.updateRole(id, role);
    }

    @Override
    @Transactional
    public void updateMayScore(final Long id, final boolean mayScore) {
        repo.updateMayScore(id, mayScore);
    }

    @Override
    @Transactional
    public void updatePassword(final Long id, final String passwordHash, final boolean passwordChanged) {
        repo.updatePassword(id, passwordHash, passwordChanged);
    }

    @Override
    @Transactional
    public void updateUsername(final Long id, final String username) {
        repo.updateUsername(id, username);
    }
}
