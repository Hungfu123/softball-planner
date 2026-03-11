package com.softball.repository;

import com.softball.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface SeasonRepository extends JpaRepository<Season, Long> {

    @Query("SELECT DISTINCT s FROM Season s " +
           "LEFT JOIN FETCH s.gameDays gd " +
           "LEFT JOIN FETCH gd.games " +
           "WHERE s.id = :id")
    Optional<Season> findByIdWithGameDaysAndGames(Long id);
}
