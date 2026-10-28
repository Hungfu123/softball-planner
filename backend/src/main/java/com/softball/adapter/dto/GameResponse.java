package com.softball.adapter.dto;

import com.softball.domain.model.Game;

import java.time.Instant;

public record GameResponse(Long id, Integer gameNumber, LeagueTeamResponse opponentTeam,
                            Integer scoreUs, Integer scoreThem, Long gameDayId,
                            int lineupEntryCount,
                            Instant endedAt,
                            String battingSide,
                            long atBatCount,
                            Instant timerRunningSince,
                            int timerAccumulatedSeconds,
                            Integer timeLimitMinutes,
                            Instant timerStartedAt) {

    public static GameResponse from(final Game game) {
        return from(game, 0L, null);
    }

    public static GameResponse from(final Game game, final long atBatCount, final Integer liveScoreUs) {
        final Integer effectiveScoreUs = liveScoreUs != null ? liveScoreUs : game.getScoreUs();
        return new GameResponse(
            game.getId(),
            game.getGameNumber(),
            game.getOpponentTeam() != null ? LeagueTeamResponse.from(game.getOpponentTeam()) : null,
            effectiveScoreUs,
            game.getScoreThem(),
            game.getGameDayId(),
            game.getLineupEntryCount(),
            game.getEndedAt(),
            game.getBattingSide(),
            atBatCount,
            game.getTimerRunningSince(),
            game.getTimerAccumulatedSeconds(),
            game.getTimeLimitMinutes(),
            game.getTimerStartedAt()
        );
    }
}
