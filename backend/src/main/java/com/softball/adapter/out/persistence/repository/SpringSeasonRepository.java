package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SeasonEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface SpringSeasonRepository extends JpaRepository<SeasonEntity, Long> {

    @Query("SELECT DISTINCT s FROM SeasonEntity s " +
           "LEFT JOIN FETCH s.gameDays gd " +
           "LEFT JOIN FETCH gd.games " +
           "WHERE s.id = :id")
    Optional<SeasonEntity> findByIdWithGameDaysAndGames(Long id);

    @Query("SELECT s FROM SeasonEntity s WHERE s.year = :year ORDER BY s.id ASC")
    List<SeasonEntity> findByYearOrderByIdAsc(int year);

    /**
     * Liste aller Jahre für die mindestens eine Season existiert. Sortiert absteigend.
     * (Filter "with scoring data" wäre präziser, aber für V1 reicht "jedes Jahr mit einer Saison".)
     */
    @Query("SELECT DISTINCT s.year FROM SeasonEntity s ORDER BY s.year DESC")
    List<Integer> findDistinctYears();
}
