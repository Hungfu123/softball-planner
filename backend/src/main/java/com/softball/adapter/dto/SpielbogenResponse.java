package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;

import java.time.Instant;
import java.time.LocalDate;

public record SpielbogenResponse(
    Long id,
    LocalDate date,
    String location,
    String homeTeamName,
    String awayTeamName,
    SeasonResponse season,
    BogenStatus status,
    Integer currentInning,
    BogenSide currentSide,
    Integer homeRuns,
    Integer awayRuns,
    Long leagueResultId,
    Instant createdAt,
    Instant updatedAt,
    Instant endedAt
) {
    public static SpielbogenResponse from(final Spielbogen b) {
        return new SpielbogenResponse(
            b.getId(),
            b.getDate(),
            b.getLocation(),
            b.getHomeTeamName(),
            b.getAwayTeamName(),
            b.getSeason() != null ? new SeasonResponse(b.getSeason().getId(), b.getSeason().getName(), b.getSeason().getYear()) : null,
            b.getStatus(),
            b.getCurrentInning(),
            b.getCurrentSide(),
            b.getHomeRuns(),
            b.getAwayRuns(),
            b.getLeagueResult() != null ? b.getLeagueResult().getId() : null,
            b.getCreatedAt(),
            b.getUpdatedAt(),
            b.getEndedAt()
        );
    }
}
