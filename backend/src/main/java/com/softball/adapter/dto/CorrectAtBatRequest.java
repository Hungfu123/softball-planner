package com.softball.adapter.dto;

import com.softball.domain.model.RunnerAdvanceReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CorrectAtBatRequest(
    Long firstSlotId,
    Long secondSlotId,
    Long thirdSlotId,
    @Min(0) Integer runsScored,
    @Valid List<RunnerAdvanceEntry> runnerAdvances
) {
    public record RunnerAdvanceEntry(
        @NotNull Long slotId,
        @NotNull Integer fromBase,
        @NotNull Integer toBase,
        @NotNull RunnerAdvanceReason reason
    ) {}
}
