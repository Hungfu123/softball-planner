package com.softball.adapter.dto;

import com.softball.domain.model.LeagueTeam;

public record LeagueTeamResponse(Long id, String name, boolean ownTeam) {
    public static LeagueTeamResponse from(final LeagueTeam team) {
        return new LeagueTeamResponse(team.getId(), team.getName(), team.isOwnTeam());
    }
}
