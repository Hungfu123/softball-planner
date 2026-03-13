package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LeagueResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringLeagueResultRepository extends JpaRepository<LeagueResultEntity, Long> {

    @Query("SELECT lr FROM LeagueResultEntity lr JOIN FETCH lr.homeTeam JOIN FETCH lr.awayTeam WHERE lr.season.id = :seasonId ORDER BY lr.date ASC")
    List<LeagueResultEntity> findBySeason_IdOrderByDateAsc(Long seasonId);

    @Query("SELECT lr FROM LeagueResultEntity lr JOIN FETCH lr.homeTeam JOIN FETCH lr.awayTeam WHERE lr.homeTeam.id = :homeTeamId OR lr.awayTeam.id = :awayTeamId")
    List<LeagueResultEntity> findByHomeTeam_IdOrAwayTeam_Id(Long homeTeamId, Long awayTeamId);
}
