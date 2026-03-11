package com.softball.dto;

import com.softball.entity.LeagueTeam;

public record LeagueTeamResponse(Long id, String name, boolean ownTeam) {
    public static LeagueTeamResponse from(final LeagueTeam team) {
        return new LeagueTeamResponse(team.getId(), team.getName(), team.isOwnTeam());
    }
}
