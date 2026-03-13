package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.PlayerMapper;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.PlayerRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.StreamSupport;

@Component
public class PlayerRepositoryAdapter implements PlayerRepository {

    private final SpringPlayerRepository repo;
    private final PlayerMapper mapper;

    public PlayerRepositoryAdapter(final SpringPlayerRepository repo, final PlayerMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<Player> findAll() {
        return repo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Player> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Player save(final Player player) {
        var entity = mapper.toEntity(player);
        if (player.getId() != null) {
            var existing = repo.findById(player.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, player);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public List<Player> findByRegularTrue() {
        return repo.findByRegularTrue().stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Player> findAllById(final Iterable<Long> ids) {
        return repo.findAllById(ids).stream().map(mapper::toDomain).toList();
    }
}
