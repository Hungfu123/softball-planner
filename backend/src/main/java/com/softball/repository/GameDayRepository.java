package com.softball.repository;

import com.softball.entity.GameDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GameDayRepository extends JpaRepository<GameDay, Long> {

    @Query("SELECT DISTINCT gd FROM GameDay gd LEFT JOIN FETCH gd.games WHERE gd.season.id = :seasonId ORDER BY gd.date ASC")
    List<GameDay> findBySeasonIdOrderByDateAsc(Long seasonId);

    @Query("SELECT DISTINCT gd FROM GameDay gd LEFT JOIN FETCH gd.availablePlayers WHERE gd.id = :id")
    Optional<GameDay> findByIdWithPlayers(Long id);

    @Query("SELECT DISTINCT gd FROM GameDay gd LEFT JOIN FETCH gd.games WHERE gd.id = :id")
    Optional<GameDay> findByIdWithGames(Long id);

    @Query("SELECT COUNT(gd) > 0 FROM GameDay gd WHERE gd.season.id = :seasonId AND gd.date = :date")
    boolean existsBySeasonAndDate(@Param("seasonId") Long seasonId, @Param("date") LocalDate date);

}
