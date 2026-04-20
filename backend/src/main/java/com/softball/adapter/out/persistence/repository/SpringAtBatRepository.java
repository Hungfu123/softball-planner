package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.AtBatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SpringAtBatRepository extends JpaRepository<AtBatEntity, Long> {

    @Query("SELECT ab FROM AtBatEntity ab JOIN FETCH ab.batter WHERE ab.game.id = :gameId ORDER BY ab.sequence ASC")
    List<AtBatEntity> findByGameIdOrderBySequenceAsc(Long gameId);

    @Query("SELECT ab FROM AtBatEntity ab JOIN FETCH ab.batter WHERE ab.game.id IN :gameIds ORDER BY ab.game.id, ab.sequence ASC")
    List<AtBatEntity> findByGameIdInOrderBySequenceAsc(List<Long> gameIds);

    @Query("SELECT ab FROM AtBatEntity ab JOIN FETCH ab.batter WHERE ab.game.gameDay.season.id = :seasonId")
    List<AtBatEntity> findBySeasonId(Long seasonId);

    @Query("SELECT COALESCE(MAX(ab.sequence), 0) FROM AtBatEntity ab WHERE ab.game.id = :gameId")
    Integer findMaxSequenceByGameId(Long gameId);

    @Query("SELECT ab FROM AtBatEntity ab WHERE ab.game.id = :gameId ORDER BY ab.sequence DESC LIMIT 1")
    Optional<AtBatEntity> findLastByGameId(Long gameId);
}
