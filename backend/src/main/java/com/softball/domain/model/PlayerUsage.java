package com.softball.domain.model;

import java.util.Map;

/**
 * Wie verlaesslich jemand da ist und wo er schlaegt — die Trainer-Sicht auf einen Spieler.
 *
 * Die Schlagzahlen im Profil sagen, wie gut jemand trifft; dieses Bild sagt, wie oft
 * man ueberhaupt mit ihm planen kann. Beides zusammen ist die Aufstellungs-Entscheidung.
 *
 * @param gameDaysTotal      vergangene Spieltage insgesamt (ab heute zaehlt nichts mehr mit)
 * @param gameDaysAvailable  davon zugesagt
 * @param gameDaysPlayed     davon tatsaechlich im Lineup (oder als DH-Batter)
 * @param trainingsTotal     nicht abgesagte Trainings bis heute
 * @param trainingsAttended  davon anwesend
 * @param averageBattingOrder Schnitt der Schlagplaetze, {@code null} wenn nie aufgestellt
 * @param battingOrderCounts wie oft welcher Schlagplatz — zeigt die Spanne, nicht nur den Schnitt
 */
public record PlayerUsage(
    int gameDaysTotal,
    int gameDaysAvailable,
    int gameDaysPlayed,
    int trainingsTotal,
    int trainingsAttended,
    Double averageBattingOrder,
    Map<Integer, Integer> battingOrderCounts
) {
    public static PlayerUsage empty() {
        return new PlayerUsage(0, 0, 0, 0, 0, null, Map.of());
    }
}
