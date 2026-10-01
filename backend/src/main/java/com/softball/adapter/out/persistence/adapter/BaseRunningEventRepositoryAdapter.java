package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.BaseRunningEventEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.BaseRunningEventMapper;
import com.softball.adapter.out.persistence.repository.SpringBaseRunningEventRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.port.out.BaseRunningEventRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class BaseRunningEventRepositoryAdapter implements BaseRunningEventRepository {

    private final SpringBaseRunningEventRepository repo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final BaseRunningEventMapper mapper;

    public BaseRunningEventRepositoryAdapter(final SpringBaseRunningEventRepository repo,
                                              final SpringGameRepository gameRepo,
                                              final SpringPlayerRepository playerRepo,
                                              final BaseRunningEventMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<BaseRunningEvent> findByGameIdOrderByIdAsc(final Long gameId) {
        return repo.findByGameIdOrderByIdAsc(gameId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<BaseRunningEvent> findByGameIdInOrderByIdAsc(final List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) return List.of();
        return repo.findByGameIdInOrderByIdAsc(gameIds).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<BaseRunningEvent> findBySeasonId(final Long seasonId) {
        return repo.findBySeasonId(seasonId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<BaseRunningEvent> findByYear(final int year) {
        return repo.findByYear(year).stream().map(mapper::toDomain).toList();
    }


    @Override
    public List<BaseRunningEvent> findAll() {
        return repo.findAllWithRunner().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<BaseRunningEvent> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public BaseRunningEvent save(final BaseRunningEvent event) {
        final GameEntity gameEntity = gameRepo.getReferenceById(event.getGame().getId());
        final PlayerEntity runnerEntity = playerRepo.getReferenceById(event.getRunner().getId());
        final BaseRunningEventEntity entity = mapper.toEntity(event, gameEntity, runnerEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsByRunnerPlayerId(final Long playerId) {
        return repo.existsByRunnerPlayerId(playerId);
    }
}
