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
    Map<Integer, InningRuns> inningRuns
) {
    public record InningRuns(int home, int away) {}
}
