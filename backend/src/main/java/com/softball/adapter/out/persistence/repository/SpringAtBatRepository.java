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

    @Query("SELECT ab FROM AtBatEntity ab JOIN FETCH ab.batter WHERE ab.game.gameDay.season.year = :year")
    List<AtBatEntity> findByYear(int year);

    @Query("SELECT ab FROM AtBatEntity ab JOIN FETCH ab.batter")
    List<AtBatEntity> findAllWithBatter();

    @Query("SELECT COALESCE(MAX(ab.sequence), 0) FROM AtBatEntity ab WHERE ab.game.id = :gameId")
    Integer findMaxSequenceByGameId(Long gameId);

    @Query("SELECT ab FROM AtBatEntity ab WHERE ab.game.id = :gameId ORDER BY ab.sequence DESC LIMIT 1")
    Optional<AtBatEntity> findLastByGameId(Long gameId);

    long countByGameId(Long gameId);

    @Query("SELECT ab.game.id, COUNT(ab) FROM AtBatEntity ab WHERE ab.game.id IN :gameIds GROUP BY ab.game.id")
    List<Object[]> countByGameIdsRaw(List<Long> gameIds);

    @Query("SELECT COALESCE(SUM(ab.runsScored), 0) FROM AtBatEntity ab WHERE ab.game.id = :gameId")
    Integer sumRunsScoredByGameId(Long gameId);

    @Query("SELECT ab.game.id, COALESCE(SUM(ab.runsScored), 0) FROM AtBatEntity ab WHERE ab.game.id IN :gameIds GROUP BY ab.game.id")
    List<Object[]> sumRunsScoredByGameIdsRaw(List<Long> gameIds);
}
