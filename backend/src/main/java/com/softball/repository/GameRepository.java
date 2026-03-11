package com.softball.repository;

import com.softball.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("SELECT g FROM Game g WHERE g.gameDay.id = :gameDayId ORDER BY g.gameNumber ASC")
    List<Game> findByGameDayIdOrderByGameNumberAsc(Long gameDayId);

    List<Game> findByOpponentTeam_Id(Long teamId);

    @Query("SELECT g FROM Game g JOIN g.gameDay gd JOIN gd.season s WHERE s.id = :seasonId AND g.scoreUs IS NOT NULL AND g.scoreThem IS NOT NULL")
    List<Game> findBySeasonIdWithScores(Long seasonId);
}
