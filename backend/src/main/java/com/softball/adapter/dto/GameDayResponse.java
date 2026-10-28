package com.softball.adapter.dto;

import com.softball.domain.model.AufstellungsLage;
import com.softball.domain.model.Game;
import com.softball.domain.model.GameDay;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    OffsetDateTime lineupsReleasedAt,
    boolean lineupsChangedSinceRelease,
    AufstellungsLage aufstellungsLage
) {
    /**
     * Es gibt bewusst keine Kurzform ohne {@code lineupsChangedSinceRelease} und Lage: der Haken
     * liesse sich ohne Datenbank nicht berechnen, und ein stillschweigendes {@code false}
     * waere falsch, die Lage braucht die Uhr. Antworten bauen {@code GameDayService.findByIdAsDto} und Verwandte.
     */
    public static GameDayResponse from(final GameDay gameDay,
                                        final Map<Long, Long> atBatCountByGameId,
                                        final Map<Long, Integer> liveScoreUsByGameId,
                                        final boolean lineupsChangedSinceRelease,
                                        final AufstellungsLage aufstellungsLage) {
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
            zonenbehaftet(gameDay.getLineupsReleasedAt()),
            lineupsChangedSinceRelease,
            aufstellungsLage
        );
    }

    /**
     * Die Datenbank haelt die Wanduhrzeit des Servers ohne Zone. Der Browser darf sie nicht
     * raten: ohne Offset las er sie als lokale Zeit und zeigte bei UTC-Server zwei Stunden zu frueh.
     */
    private static OffsetDateTime zonenbehaftet(final java.time.LocalDateTime zeit) {
        return zeit == null ? null : zeit.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    private static GameResponse mapGame(final Game game,
                                         final Map<Long, Long> atBatCountByGameId,
                                         final Map<Long, Integer> liveScoreUsByGameId) {
        final long atBatCount = atBatCountByGameId.getOrDefault(game.getId(), 0L);
        final Integer liveScoreUs = atBatCount > 0 ? liveScoreUsByGameId.get(game.getId()) : null;
        return GameResponse.from(game, atBatCount, liveScoreUs);
    }
}
