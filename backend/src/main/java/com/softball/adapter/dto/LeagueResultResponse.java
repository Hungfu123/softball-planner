package com.softball.adapter.dto;

import com.softball.domain.model.LeagueResult;

import java.time.LocalDate;

public record LeagueResultResponse(
    Long id,
    LeagueTeamResponse homeTeam,
    LeagueTeamResponse awayTeam,
    int homeScore,
    int awayScore,
    LocalDate date
) {
    public static LeagueResultResponse from(final LeagueResult result) {
        return new LeagueResultResponse(
            result.getId(),
            LeagueTeamResponse.from(result.getHomeTeam()),
            LeagueTeamResponse.from(result.getAwayTeam()),
            result.getHomeScore(),
            result.getAwayScore(),
            result.getDate()
        );
    }
}
