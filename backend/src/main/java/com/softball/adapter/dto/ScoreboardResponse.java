package com.softball.adapter.dto;

import java.util.List;

public record ScoreboardResponse(
    Long gameId,
    Integer scoreUs,
    Integer scoreThem,
    Integer currentInning,
    Integer outsInCurrentInning,
    AtBatResponse.BaseStateDto baseState,
    List<RunnerOnBase> runners,
    Long currentBatterId,
    String currentBatterName,
    Integer currentBatterOrder,
    Integer totalAtBats
) {
    public record RunnerOnBase(int base, Long playerId, String playerName, Integer battingOrder) {}
}
