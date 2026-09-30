package com.softball.domain.port.out;

import com.softball.domain.model.BaseRunningEvent;

import java.util.List;
import java.util.Optional;

public interface BaseRunningEventRepository {
    List<BaseRunningEvent> findByGameIdOrderByIdAsc(Long gameId);
    List<BaseRunningEvent> findByGameIdInOrderByIdAsc(List<Long> gameIds);
    List<BaseRunningEvent> findBySeasonId(Long seasonId);
    List<BaseRunningEvent> findByYear(int year);
    List<BaseRunningEvent> findByOpponentTeamId(Long teamId);
    List<BaseRunningEvent> findAll();
    Optional<BaseRunningEvent> findById(Long id);
    BaseRunningEvent save(BaseRunningEvent event);
    void deleteById(Long id);
    boolean existsByRunnerPlayerId(Long playerId);
}
