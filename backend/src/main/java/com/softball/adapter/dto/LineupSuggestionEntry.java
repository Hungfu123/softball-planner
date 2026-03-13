package com.softball.adapter.dto;

public record LineupSuggestionEntry(
    Long playerId,
    String playerName,
    String position,
    int battingOrder
) {}
