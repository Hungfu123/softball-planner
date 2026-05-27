package com.softball.adapter.dto;

import com.softball.domain.model.InfieldPosition;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes,
        List<InfieldPosition> infieldPositions,
        Boolean withBeginnerGroup,
        Integer beginnerCount
) {
    public List<InfieldPosition> infieldPositionsOrEmpty() {
        return infieldPositions != null ? infieldPositions : List.of();
    }

    public boolean withBeginnerGroupOrFalse() {
        return Boolean.TRUE.equals(withBeginnerGroup);
    }

    public int beginnerCountOrZero() {
        return beginnerCount != null ? beginnerCount : 0;
    }
}
