package com.softball.domain.port.out;

import com.softball.domain.model.LeagueResult;
import java.util.List;
import java.util.Optional;

public interface LeagueResultRepository {
    List<LeagueResult> findBySeasonIdOrderByDateAsc(Long seasonId);
    Optional<LeagueResult> findById(Long id);
    LeagueResult save(LeagueResult result);
    void deleteById(Long id);
    List<LeagueResult> findByHomeTeamIdOrAwayTeamId(Long homeTeamId, Long awayTeamId);
    boolean existsById(Long id);
    void deleteAll(List<LeagueResult> results);
}
