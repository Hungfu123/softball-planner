package com.softball.adapter.dto;

import com.softball.domain.model.Game;

public record GameResponse(Long id, Integer gameNumber, LeagueTeamResponse opponentTeam,
                            Integer scoreUs, Integer scoreThem, Long gameDayId,
                            int lineupEntryCount) {
    public static GameResponse from(final Game game) {
        return new GameResponse(
            game.getId(),
            game.getGameNumber(),
            game.getOpponentTeam() != null ? LeagueTeamResponse.from(game.getOpponentTeam()) : null,
            game.getScoreUs(),
            game.getScoreThem(),
            game.getGameDayId(),
            game.getLineupEntryCount()
        );
    }
}
