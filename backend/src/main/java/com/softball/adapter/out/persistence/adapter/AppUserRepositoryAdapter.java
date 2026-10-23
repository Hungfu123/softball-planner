package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.AppUserMapper;
import com.softball.adapter.out.persistence.repository.SpringAppUserRepository;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import org.springframework.stereotype.Component;

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
    public AppUser save(final AppUser user) {
        if (user.getId() != null) {
            final var existing = repo.findById(user.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, user);
                return mapper.toDomain(repo.save(existing));
            }
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
    public boolean existsByUsername(final String username) {
        return repo.existsByUsernameIgnoreCase(username);
    }
}
