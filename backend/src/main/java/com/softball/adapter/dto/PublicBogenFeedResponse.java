package com.softball.adapter.dto;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Öffentlicher Zuschauer-Feed für einen Spielbogen — bewusst flach und ohne
 * interne Felder (kein Season-Objekt, kein LeagueResult, kein publicToken).
 */
public record PublicBogenFeedResponse(
    String homeTeamName,
    String awayTeamName,
    LocalDate date,
    String location,
    BogenStatus status,
    Integer currentInning,
    BogenSide currentSide,
    Integer homeRuns,
    Integer awayRuns,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<SpielbogenStealingResponse> stealingEvents,
    List<SpielbogenSubstitutionResponse> substitutions,
    Map<Integer, BogenSheetResponse.InningRuns> inningRuns,
    BogenSheetResponse.TeamTotals homeTotals,
    BogenSheetResponse.TeamTotals awayTotals
) {}
