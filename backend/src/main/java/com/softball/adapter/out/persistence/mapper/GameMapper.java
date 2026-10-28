package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.domain.model.Game;
import org.springframework.stereotype.Component;

@Component
public class GameMapper {

    private final LeagueTeamMapper leagueTeamMapper;

    public GameMapper(final LeagueTeamMapper leagueTeamMapper) {
        this.leagueTeamMapper = leagueTeamMapper;
    }

    public Game toDomain(final GameEntity entity) {
        if (entity == null) return null;
        final Game game = new Game(entity.getId(), entity.getGameNumber());
        game.setScoreUs(entity.getScoreUs());
        game.setScoreThem(entity.getScoreThem());
        game.setOpponentTeam(leagueTeamMapper.toDomain(entity.getOpponentTeam()));
        game.setLineupEntryCount(entity.getLineupEntryCount());
        game.setEndedAt(entity.getEndedAt());
        game.setBattingSide(entity.getBattingSide());
        game.setTimerRunningSince(entity.getTimerRunningSince());
        game.setTimerAccumulatedSeconds(entity.getTimerAccumulatedSeconds());
        game.setTimeLimitMinutes(entity.getTimeLimitMinutes());
        game.setTimerStartedAt(entity.getTimerStartedAt());
        if (entity.getGameDay() != null) {
            final com.softball.domain.model.GameDay gd = new com.softball.domain.model.GameDay();
            gd.setId(entity.getGameDay().getId());
            gd.setDate(entity.getGameDay().getDate());
            gd.setLabel(entity.getGameDay().getLabel());
            if (entity.getGameDay().getSeason() != null) {
                final var seasonEntity = entity.getGameDay().getSeason();
                gd.setSeason(new com.softball.domain.model.Season(
                    seasonEntity.getId(), seasonEntity.getName(), seasonEntity.getYear()));
            }
            game.setGameDay(gd);
        }
        return game;
    }
}
