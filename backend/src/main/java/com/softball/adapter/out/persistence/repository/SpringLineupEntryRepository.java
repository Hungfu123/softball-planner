package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LineupEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringLineupEntryRepository extends JpaRepository<LineupEntryEntity, Long> {

    @Query("SELECT le FROM LineupEntryEntity le JOIN FETCH le.player LEFT JOIN FETCH le.dhBatterPlayer WHERE le.game.id = :gameId ORDER BY le.battingOrder ASC")
    List<LineupEntryEntity> findByGameIdOrderByBattingOrderAsc(Long gameId);

    @Query("SELECT le FROM LineupEntryEntity le JOIN FETCH le.player LEFT JOIN FETCH le.dhBatterPlayer JOIN FETCH le.game WHERE le.game.id IN :gameIds ORDER BY le.battingOrder ASC")
    List<LineupEntryEntity> findByGameIdInOrderByBattingOrderAsc(List<Long> gameIds);

    void deleteByGameId(Long gameId);
}
