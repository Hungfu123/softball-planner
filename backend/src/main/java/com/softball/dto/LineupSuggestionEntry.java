package com.softball.dto;

public record LineupSuggestionEntry(
    Long playerId,
    String playerName,
    String position,
    int battingOrder
) {}
