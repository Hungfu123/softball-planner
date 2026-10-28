package com.softball.adapter.dto;

import com.softball.domain.model.Game;
import com.softball.domain.model.GameDay;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public record GameDayResponse(
    Long id,
    LocalDate date,
    String label,
    String location,
    Long seasonId,
    Set<PlayerResponse> availablePlayers,
    List<GameResponse> games,
    LocalDateTime lineupsReleasedAt,
    boolean lineupsChangedSinceRelease
) {
    public static GameDayResponse from(final GameDay gameDay) {
        return from(gameDay, Map.of(), Map.of());
    }

    public static GameDayResponse from(final GameDay gameDay,
                                        final Map<Long, Long> atBatCountByGameId,
                                        final Map<Long, Integer> liveScoreUsByGameId) {
        return from(gameDay, atBatCountByGameId, liveScoreUsByGameId, false);
    }

    public static GameDayResponse from(final GameDay gameDay,
                                        final Map<Long, Long> atBatCountByGameId,
                                        final Map<Long, Integer> liveScoreUsByGameId,
                                        final boolean lineupsChangedSinceRelease) {
        return new GameDayResponse(
            gameDay.getId(),
            gameDay.getDate(),
            gameDay.getLabel(),
            gameDay.getLocation(),
            gameDay.getSeasonId(),
            gameDay.getAvailablePlayers().stream()
                .map(PlayerResponse::from)
                .collect(Collectors.toSet()),
            gameDay.getGames().stream()
                .map(g -> mapGame(g, atBatCountByGameId, liveScoreUsByGameId))
                .collect(Collectors.toList()),
            gameDay.getLineupsReleasedAt(),
            lineupsChangedSinceRelease
        );
    }

    private static GameResponse mapGame(final Game game,
                                         final Map<Long, Long> atBatCountByGameId,
                                         final Map<Long, Integer> liveScoreUsByGameId) {
        final long atBatCount = atBatCountByGameId.getOrDefault(game.getId(), 0L);
        final Integer liveScoreUs = atBatCount > 0 ? liveScoreUsByGameId.get(game.getId()) : null;
        return GameResponse.from(game, atBatCount, liveScoreUs);
    }
}
