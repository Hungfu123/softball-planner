package com.softball.adapter.dto;

import java.util.Map;

public record SeasonPlayerStats(
    Long playerId,
    String playerName,
    double totalGames,
    Map<String, Long> positionCounts
) {}
