package com.softball.adapter.dto;

import java.math.BigDecimal;

/**
 * Team-aggregierte Schlag-Statistik gegen EINEN Gegner — für die Gegner-Übersicht
 * ("gegen wen schlagen wir gut?").
 *
 * Schlüssel ist der Team-NAME, nicht die Team-ID: League-Teams sind pro Saison
 * angelegt, derselbe Gegner existiert über die Jahre als mehrere Zeilen —
 * die Übersicht fasst sie unter einem Namen zusammen.
 */
public record OpponentBattingStatsResponse(
    String teamName,
    int games,
    int plateAppearances,
    int atBats,
    int hits,
    int runs,
    BigDecimal battingAverage
) {}
