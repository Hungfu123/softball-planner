package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringGameRepository extends JpaRepository<GameEntity, Long> {

    @Query("SELECT g FROM GameEntity g WHERE g.gameDay.id = :gameDayId ORDER BY g.gameNumber ASC")
    List<GameEntity> findByGameDayIdOrderByGameNumberAsc(Long gameDayId);

    List<GameEntity> findByOpponentTeam_Id(Long teamId);

    @Query("SELECT g FROM GameEntity g JOIN g.gameDay gd JOIN gd.season s WHERE s.id = :seasonId AND g.scoreUs IS NOT NULL AND g.scoreThem IS NOT NULL")
    List<GameEntity> findBySeasonIdWithScores(Long seasonId);
}
