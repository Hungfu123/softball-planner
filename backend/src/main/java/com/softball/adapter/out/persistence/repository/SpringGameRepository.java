package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface SpringGameRepository extends JpaRepository<GameEntity, Long> {

    @Query("SELECT g FROM GameEntity g WHERE g.gameDay.id = :gameDayId ORDER BY g.gameNumber ASC")
    List<GameEntity> findByGameDayIdOrderByGameNumberAsc(Long gameDayId);

    List<GameEntity> findByOpponentTeam_Id(Long teamId);

    /** Nur die Spieltag-id — ohne das Spiel zu laden und ohne den Spieltag anzufassen. */
    @Query("SELECT g.gameDay.id FROM GameEntity g WHERE g.id = :gameId")
    Optional<Long> findGameDayId(Long gameId);

    @Query("SELECT g FROM GameEntity g JOIN g.gameDay gd JOIN gd.season s WHERE s.id = :seasonId AND g.scoreUs IS NOT NULL AND g.scoreThem IS NOT NULL")
    List<GameEntity> findBySeasonIdWithScores(Long seasonId);

    @Query("SELECT g FROM GameEntity g JOIN FETCH g.opponentTeam WHERE g.opponentTeam IS NOT NULL")
    List<GameEntity> findAllWithOpponent();

    @Query("""
        SELECT g FROM GameEntity g
        JOIN FETCH g.gameDay gd
        JOIN FETCH gd.season
        LEFT JOIN FETCH g.opponentTeam
        WHERE g.id IN :gameIds
        """)
    List<GameEntity> findAllByIdWithDetails(List<Long> gameIds);
}
