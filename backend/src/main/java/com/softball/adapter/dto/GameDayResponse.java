package com.softball.adapter.dto;

import com.softball.domain.model.GameDay;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record GameDayResponse(
    Long id,
    LocalDate date,
    String label,
    String location,
    Long seasonId,
    Set<PlayerResponse> availablePlayers,
    List<GameResponse> games
) {
    public static GameDayResponse from(final GameDay gameDay) {
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
                .map(GameResponse::from)
                .collect(Collectors.toList())
        );
    }
}
