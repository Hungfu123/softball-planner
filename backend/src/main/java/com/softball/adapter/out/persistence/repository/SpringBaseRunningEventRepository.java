package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.BaseRunningEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringBaseRunningEventRepository extends JpaRepository<BaseRunningEventEntity, Long> {

    @Query("SELECT e FROM BaseRunningEventEntity e JOIN FETCH e.runner WHERE e.game.id = :gameId ORDER BY e.id ASC")
    List<BaseRunningEventEntity> findByGameIdOrderByIdAsc(Long gameId);

    @Query("SELECT e FROM BaseRunningEventEntity e JOIN FETCH e.runner WHERE e.game.id IN :gameIds ORDER BY e.id ASC")
    List<BaseRunningEventEntity> findByGameIdInOrderByIdAsc(List<Long> gameIds);

    @Query("SELECT e FROM BaseRunningEventEntity e JOIN FETCH e.runner WHERE e.game.gameDay.season.id = :seasonId")
    List<BaseRunningEventEntity> findBySeasonId(Long seasonId);

    @Query("SELECT e FROM BaseRunningEventEntity e JOIN FETCH e.runner WHERE e.game.gameDay.season.year = :year")
    List<BaseRunningEventEntity> findByYear(int year);


    @Query("SELECT e FROM BaseRunningEventEntity e JOIN FETCH e.runner")
    List<BaseRunningEventEntity> findAllWithRunner();

    @Query("SELECT COUNT(e) > 0 FROM BaseRunningEventEntity e WHERE e.runner.id = :playerId")
    boolean existsByRunnerPlayerId(Long playerId);
}
