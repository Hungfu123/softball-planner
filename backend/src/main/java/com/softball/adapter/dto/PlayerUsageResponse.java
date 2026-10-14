package com.softball.adapter.dto;

import com.softball.domain.model.PlayerUsage;

import java.util.Map;

/** Einsatz-Profil eines Spielers — Zusagen, Aufstellungen, Training, Schlagplatz. */
public record PlayerUsageResponse(
    int gameDaysTotal,
    int gameDaysAvailable,
    int gameDaysPlayed,
    int trainingsTotal,
    int trainingsAttended,
    Double averageBattingOrder,
    Map<Integer, Integer> battingOrderCounts
) {
    public static PlayerUsageResponse from(final PlayerUsage usage) {
        return new PlayerUsageResponse(
            usage.gameDaysTotal(),
            usage.gameDaysAvailable(),
            usage.gameDaysPlayed(),
            usage.trainingsTotal(),
            usage.trainingsAttended(),
            usage.averageBattingOrder(),
            usage.battingOrderCounts()
        );
    }
}
