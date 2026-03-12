package com.softball.dto;

public record TrainingStatsResponse(Long playerId, String playerName, long attended, long totalTrainings, boolean regular) {}
