package com.softball.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Ein Punkt der Form-Kurve eines Spielers: ein Spiel, in dem er am Schlag war.
 *
 * Die Spiel-Zahlen (gameHits/gameAtBats …) sind der Rohwert dieses Tages, die
 * rolling-Werte der gleitende Schnitt über die letzten N Plate Appearances
 * einschließlich dieses Spiels — ein 2-für-3 hebt die Kurve, kippt sie aber nicht.
 *
 * provisional = das Fenster ist noch nicht voll (der Spieler hat insgesamt weniger
 * als N Plate Appearances). Die Kurve wird dort gestrichelt gezeichnet, damit ein
 * 1.000er-Start nicht wie eine Leistung aussieht.
 */
public record PlayerFormPoint(
    Long gameId,
    LocalDate date,
    String opponent,
    Long seasonId,
    String seasonName,
    Integer year,
    int gamePlateAppearances,
    int gameAtBats,
    int gameHits,
    int gameWalks,
    int gameStrikeouts,
    int gameRunsBattedIn,
    int gameTotalBases,
    /** Wie oft er in diesem Spiel eine Base erreichte (H + BB + HBP) — Grundlage der OBP über mehrere Spiele. */
    int gameTimesOnBase,
    int gameStolenBases,
    int gameCaughtStealing,
    BigDecimal rollingAverage,
    BigDecimal rollingOnBase,
    BigDecimal rollingSlugging,
    BigDecimal rollingOps,
    int rollingPlateAppearances,
    boolean provisional
) {
}
