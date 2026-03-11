package com.softball.repository;

import com.softball.entity.LeagueTeam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeagueTeamRepository extends JpaRepository<LeagueTeam, Long> {
    List<LeagueTeam> findBySeason_IdOrderByNameAsc(Long seasonId);
    Optional<LeagueTeam> findBySeason_IdAndNameIgnoreCase(Long seasonId, String name);
}
