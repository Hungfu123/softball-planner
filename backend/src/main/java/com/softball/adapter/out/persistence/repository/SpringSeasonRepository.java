package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SeasonEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface SpringSeasonRepository extends JpaRepository<SeasonEntity, Long> {

    @Query("SELECT DISTINCT s FROM SeasonEntity s " +
           "LEFT JOIN FETCH s.gameDays gd " +
           "LEFT JOIN FETCH gd.games " +
           "WHERE s.id = :id")
    Optional<SeasonEntity> findByIdWithGameDaysAndGames(Long id);
}
