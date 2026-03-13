package com.softball.adapter.dto;

public record TrainingStatsResponse(Long playerId, String playerName, long attended, long totalTrainings, boolean regular) {}
