package com.softball.domain.port.out;

import com.softball.domain.model.AtBat;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface AtBatRepository {
    List<AtBat> findByGameIdOrderBySequenceAsc(Long gameId);
    List<AtBat> findByGameIdInOrderBySequenceAsc(List<Long> gameIds);
    List<AtBat> findBySeasonId(Long seasonId);
    List<AtBat> findByYear(int year);
    List<AtBat> findAll();
    Optional<AtBat> findById(Long id);
    Optional<AtBat> findLastByGameId(Long gameId);
    Integer findMaxSequenceByGameId(Long gameId);
    long countByGameId(Long gameId);
    Map<Long, Long> countByGameIds(List<Long> gameIds);
    int sumRunsScoredByGameId(Long gameId);
    boolean existsByPlayerId(Long playerId);
    Map<Long, Integer> sumRunsScoredByGameIds(List<Long> gameIds);
    AtBat save(AtBat atBat);
    void deleteById(Long id);
}
