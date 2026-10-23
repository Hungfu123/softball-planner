package com.softball.adapter.dto;

import com.softball.domain.model.PlayerUsage;

import java.util.Map;

/**
 * Einsatz-Profil eines Spielers — Zusagen, Aufstellungen, Training, Schlagplatz. Die beiden
 * Trainingsfelder sind {@code null}, wenn der Leser sie nicht sehen darf (Spieler).
 */
public record PlayerUsageResponse(
    int gameDaysTotal,
    int gameDaysAvailable,
    int gameDaysPlayed,
    Integer trainingsTotal,
    Integer trainingsAttended,
    Double averageBattingOrder,
    Map<Integer, Integer> battingOrderCounts
) {
    public static PlayerUsageResponse from(final PlayerUsage usage, final boolean mitTraining) {
        return new PlayerUsageResponse(
            usage.gameDaysTotal(),
            usage.gameDaysAvailable(),
            usage.gameDaysPlayed(),
            mitTraining ? usage.trainingsTotal() : null,
            mitTraining ? usage.trainingsAttended() : null,
            usage.averageBattingOrder(),
            usage.battingOrderCounts()
        );
    }
}
