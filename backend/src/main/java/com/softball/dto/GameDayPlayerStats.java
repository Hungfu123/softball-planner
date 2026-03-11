package com.softball.dto;

import java.util.List;

public record GameDayPlayerStats(
    Long playerId,
    String playerName,
    double gameCount,
    List<GamePosition> positions
) {
    public record GamePosition(int gameNumber, String position) {}
}
