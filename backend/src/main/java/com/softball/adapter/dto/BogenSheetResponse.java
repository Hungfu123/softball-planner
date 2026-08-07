package com.softball.adapter.dto;

import java.util.List;
import java.util.Map;

public record BogenSheetResponse(
    SpielbogenResponse meta,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<SpielbogenStealingResponse> stealingEvents,
    List<SpielbogenSubstitutionResponse> substitutions,
    List<SpielbogenPositionChangeResponse> positionChanges,
    List<SpielbogenRunnerAdvanceResponse> runnerAdvances,
    Map<Integer, InningRuns> inningRuns,
    TeamTotals homeTotals,
    TeamTotals awayTotals
) {
    public record InningRuns(int home, int away) {}
    public record TeamTotals(int runs, int hits, int errors) {}
}
