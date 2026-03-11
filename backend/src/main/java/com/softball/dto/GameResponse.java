package com.softball.dto;

import com.softball.entity.Game;

public record GameResponse(Long id, Integer gameNumber, LeagueTeamResponse opponentTeam,
                            Integer scoreUs, Integer scoreThem, Long gameDayId) {
    public static GameResponse from(final Game game) {
        return new GameResponse(
            game.getId(),
            game.getGameNumber(),
            game.getOpponentTeam() != null ? LeagueTeamResponse.from(game.getOpponentTeam()) : null,
            game.getScoreUs(),
            game.getScoreThem(),
            game.getGameDayId()
        );
    }
}
