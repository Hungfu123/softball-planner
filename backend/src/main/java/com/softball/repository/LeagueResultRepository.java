package com.softball.repository;

import com.softball.entity.LeagueResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeagueResultRepository extends JpaRepository<LeagueResult, Long> {

    List<LeagueResult> findBySeason_IdOrderByDateAsc(Long seasonId);

    List<LeagueResult> findByHomeTeam_IdOrAwayTeam_Id(Long homeTeamId, Long awayTeamId);
}
