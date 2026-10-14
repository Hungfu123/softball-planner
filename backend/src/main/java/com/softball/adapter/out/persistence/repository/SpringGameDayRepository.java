package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameDayEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SpringGameDayRepository extends JpaRepository<GameDayEntity, Long> {

    @Query("SELECT DISTINCT gd FROM GameDayEntity gd LEFT JOIN FETCH gd.games WHERE gd.season.id = :seasonId ORDER BY gd.date ASC")
    List<GameDayEntity> findBySeasonIdOrderByDateAsc(Long seasonId);

    @Query("SELECT DISTINCT gd FROM GameDayEntity gd LEFT JOIN FETCH gd.availablePlayers WHERE gd.id = :id")
    Optional<GameDayEntity> findByIdWithPlayers(Long id);

    @Query("SELECT DISTINCT gd FROM GameDayEntity gd LEFT JOIN FETCH gd.games WHERE gd.id = :id")
    Optional<GameDayEntity> findByIdWithGames(Long id);

    @Query("SELECT COUNT(gd) > 0 FROM GameDayEntity gd WHERE gd.season.id = :seasonId AND gd.date = :date")
    boolean existsBySeasonAndDate(@Param("seasonId") Long seasonId, @Param("date") LocalDate date);

    @Query("""
        SELECT DISTINCT gd.id FROM GameDayEntity gd
        LEFT JOIN gd.availablePlayers ap
        LEFT JOIN gd.games g
        LEFT JOIN g.lineupEntries le
        LEFT JOIN g.staff st
        WHERE ap.id = :playerId
           OR le.player.id = :playerId
           OR le.dhBatterPlayer.id = :playerId
           OR st.player.id = :playerId
        """)
    List<Long> findGameDayIdsByPlayerPlanning(Long playerId);

    @Query("SELECT gd.id FROM GameDayEntity gd JOIN gd.availablePlayers ap WHERE ap.id = :playerId")
    List<Long> findGameDayIdsByAvailablePlayer(Long playerId);
}
