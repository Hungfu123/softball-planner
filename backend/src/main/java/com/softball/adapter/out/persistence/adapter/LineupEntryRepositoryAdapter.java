package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.LineupEntryMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.port.out.LineupEntryRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
public class LineupEntryRepositoryAdapter implements LineupEntryRepository {

    private final SpringLineupEntryRepository repo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final LineupEntryMapper mapper;

    public LineupEntryRepositoryAdapter(final SpringLineupEntryRepository repo,
                                         final SpringGameRepository gameRepo,
                                         final SpringPlayerRepository playerRepo,
                                         final LineupEntryMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<LineupEntry> findByGameIdOrderByBattingOrderAsc(final Long gameId) {
        return repo.findByGameIdOrderByBattingOrderAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<LineupEntry> findByGameIdInOrderByBattingOrderAsc(final List<Long> gameIds) {
        return repo.findByGameIdInOrderByBattingOrderAsc(gameIds).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<Long> findGameDayIdsByPlayerId(final Long playerId) {
        return repo.findGameDayIdsByPlayerId(playerId);
    }

    @Override
    public List<Integer> findBattingOrdersByPlayerId(final Long playerId, final LocalDate heute) {
        return repo.findBattingOrdersByPlayerId(playerId, heute);
    }

    @Override
    public List<Integer> findBattingOrdersByPlayerIdAndYear(final Long playerId, final int year,
                                                           final LocalDate heute) {
        return repo.findBattingOrdersByPlayerIdAndYear(playerId, year, heute);
    }

    @Override
    public List<Integer> findBattingOrdersByPlayerIdAndSeason(final Long playerId, final long seasonId,
                                                             final LocalDate heute) {
        return repo.findBattingOrdersByPlayerIdAndSeason(playerId, seasonId, heute);
    }

    @Override
    @Transactional
    public void deleteByGameId(final Long gameId) {
        repo.deleteByGameId(gameId);
    }

    @Override
    public List<LineupEntry> saveAll(final List<LineupEntry> entries) {
        var entities = entries.stream().map(entry -> {
            GameEntity gameEntity = gameRepo.getReferenceById(entry.getGame().getId());
            PlayerEntity playerEntity = playerRepo.getReferenceById(entry.getPlayer().getId());
            PlayerEntity dhEntity = entry.getDhBatterPlayer() != null
                ? playerRepo.getReferenceById(entry.getDhBatterPlayer().getId())
                : null;
            return mapper.toEntity(entry, gameEntity, playerEntity, dhEntity);
        }).toList();
        return repo.saveAll(entities).stream().map(mapper::toDomain).toList();
    }

    @Override
    public LineupEntry save(final LineupEntry entry) {
        GameEntity gameEntity = gameRepo.getReferenceById(entry.getGame().getId());
        PlayerEntity playerEntity = playerRepo.getReferenceById(entry.getPlayer().getId());
        PlayerEntity dhEntity = entry.getDhBatterPlayer() != null
            ? playerRepo.getReferenceById(entry.getDhBatterPlayer().getId())
            : null;
        var entity = mapper.toEntity(entry, gameEntity, playerEntity, dhEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void flush() {
        repo.flush();
    }

    @Override
    public void deleteAll(final List<LineupEntry> entries) {
        var ids = entries.stream().map(LineupEntry::getId).filter(id -> id != null).toList();
        if (!ids.isEmpty()) {
            repo.deleteAllById(ids);
        }
    }
}
