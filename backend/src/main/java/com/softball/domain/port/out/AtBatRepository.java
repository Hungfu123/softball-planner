package com.softball.domain.port.out;

import com.softball.domain.model.AtBat;

import java.util.List;
import java.util.Optional;

public interface AtBatRepository {
    List<AtBat> findByGameIdOrderBySequenceAsc(Long gameId);
    List<AtBat> findByGameIdInOrderBySequenceAsc(List<Long> gameIds);
    List<AtBat> findBySeasonId(Long seasonId);
    Optional<AtBat> findById(Long id);
    Optional<AtBat> findLastByGameId(Long gameId);
    Integer findMaxSequenceByGameId(Long gameId);
    AtBat save(AtBat atBat);
    void deleteById(Long id);
}
