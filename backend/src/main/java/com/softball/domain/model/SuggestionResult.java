package com.softball.domain.model;

public record SuggestionResult(
    Long playerId,
    String playerName,
    String position,
    int battingOrder
) {}
