package com.softball.adapter.dto;

import com.softball.domain.model.PlayerFormPoint;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Ein Punkt der Form-Kurve (siehe {@link PlayerFormPoint}). */
public record PlayerFormPointResponse(
    Long gameId,
    LocalDate date,
    String opponent,
    Long seasonId,
    String seasonName,
    Integer year,
    int plateAppearances,
    int atBats,
    int hits,
    int walks,
    int strikeouts,
    int runsBattedIn,
    int totalBases,
    int timesOnBase,
    int stolenBases,
    int caughtStealing,
    BigDecimal rollingAverage,
    BigDecimal rollingOnBase,
    BigDecimal rollingSlugging,
    BigDecimal rollingOps,
    int rollingPlateAppearances,
    boolean provisional
) {
    public static PlayerFormPointResponse from(final PlayerFormPoint p) {
        return new PlayerFormPointResponse(
            p.gameId(), p.date(), p.opponent(), p.seasonId(), p.seasonName(), p.year(),
            p.gamePlateAppearances(), p.gameAtBats(), p.gameHits(), p.gameWalks(),
            p.gameStrikeouts(), p.gameRunsBattedIn(), p.gameTotalBases(), p.gameTimesOnBase(),
            p.gameStolenBases(), p.gameCaughtStealing(),
            p.rollingAverage(), p.rollingOnBase(), p.rollingSlugging(), p.rollingOps(),
            p.rollingPlateAppearances(), p.provisional());
    }
}
