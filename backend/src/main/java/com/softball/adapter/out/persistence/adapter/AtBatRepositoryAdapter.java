package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.AtBatMapper;
import com.softball.adapter.out.persistence.repository.SpringAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseState;
import com.softball.domain.port.out.AtBatRepository;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class AtBatRepositoryAdapter implements AtBatRepository {

    private final SpringAtBatRepository repo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final AtBatMapper mapper;

    public AtBatRepositoryAdapter(final SpringAtBatRepository repo,
                                   final SpringGameRepository gameRepo,
                                   final SpringPlayerRepository playerRepo,
                                   final AtBatMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<AtBat> findByGameIdOrderBySequenceAsc(final Long gameId) {
        return repo.findByGameIdOrderBySequenceAsc(gameId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<AtBat> findByGameIdInOrderBySequenceAsc(final List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) return List.of();
        return repo.findByGameIdInOrderBySequenceAsc(gameIds).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<AtBat> findBySeasonId(final Long seasonId) {
        return repo.findBySeasonId(seasonId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<AtBat> findByYear(final int year) {
        return repo.findByYear(year).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<AtBat> findByOpponentTeamId(final Long teamId) {
        return repo.findByOpponentTeamId(teamId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<AtBat> findAll() {
        return repo.findAllWithBatter().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<AtBat> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<AtBat> findLastByGameId(final Long gameId) {
        return repo.findLastByGameId(gameId).map(mapper::toDomain);
    }

    @Override
    public Integer findMaxSequenceByGameId(final Long gameId) {
        final Integer v = repo.findMaxSequenceByGameId(gameId);
        return v != null ? v : 0;
    }

    @Override
    public long countByGameId(final Long gameId) {
        return repo.countByGameId(gameId);
    }

    @Override
    public Map<Long, Long> countByGameIds(final List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) return Map.of();
        final Map<Long, Long> result = new HashMap<>();
        for (final Long id : gameIds) result.put(id, 0L);
        for (final Object[] row : repo.countByGameIdsRaw(gameIds)) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }

    @Override
    public int sumRunsScoredByGameId(final Long gameId) {
        final Integer v = repo.sumRunsScoredByGameId(gameId);
        return v != null ? v : 0;
    }

    @Override
    public Map<Long, Integer> sumRunsScoredByGameIds(final List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) return Map.of();
        final Map<Long, Integer> result = new HashMap<>();
        for (final Long id : gameIds) result.put(id, 0);
        for (final Object[] row : repo.sumRunsScoredByGameIdsRaw(gameIds)) {
            final Long sum = ((Number) row[1]).longValue();
            result.put((Long) row[0], sum.intValue());
        }
        return result;
    }

    @Override
    public AtBat save(final AtBat atBat) {
        final GameEntity gameEntity = gameRepo.getReferenceById(atBat.getGame().getId());
        final PlayerEntity batterEntity = playerRepo.getReferenceById(atBat.getBatter().getId());
        final BaseState state = atBat.getBaseStateAfter();
        final PlayerEntity r1 = state != null && state.first() != null ? playerRepo.getReferenceById(state.first()) : null;
        final PlayerEntity r2 = state != null && state.second() != null ? playerRepo.getReferenceById(state.second()) : null;
        final PlayerEntity r3 = state != null && state.third() != null ? playerRepo.getReferenceById(state.third()) : null;
        final AtBatEntity entity = mapper.toEntity(atBat, gameEntity, batterEntity, r1, r2, r3);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsByPlayerId(final Long playerId) {
        return repo.existsByPlayerId(playerId);
    }
}
