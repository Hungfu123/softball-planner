package com.softball.domain.model;

/**
 * Eine vergebene Auszeichnung für einen Spieltag.
 * displayValue = menschenlesbarer Stat-Hinweis (z.B. "OPS 1.250", "8 Bases").
 */
public record Award(
    AwardType type,
    Long playerId,
    String playerName,
    String displayValue
) {}
