package com.softball.domain.port.out;

import com.softball.domain.model.LeagueTeam;
import java.util.List;
import java.util.Optional;

public interface LeagueTeamRepository {
    List<LeagueTeam> findBySeasonIdOrderByNameAsc(Long seasonId);
    Optional<LeagueTeam> findById(Long id);
    Optional<LeagueTeam> findBySeasonIdAndNameIgnoreCase(Long seasonId, String name);
    LeagueTeam save(LeagueTeam team);
    void deleteById(Long id);
}
