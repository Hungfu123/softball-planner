package com.softball.adapter.dto;

import java.math.BigDecimal;

/**
 * Team-aggregierte Schlag-Statistik gegen EINEN Gegner — für die Gegner-Übersicht
 * ("gegen wen schlagen wir gut?").
 */
public record OpponentBattingStatsResponse(
    Long teamId,
    String teamName,
    int games,
    int plateAppearances,
    int atBats,
    int hits,
    int runs,
    BigDecimal battingAverage
) {}
