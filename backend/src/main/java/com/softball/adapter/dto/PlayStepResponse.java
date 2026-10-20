package com.softball.adapter.dto;

import com.softball.domain.model.PlayMarkers;
import com.softball.domain.model.PlayStep;

public record PlayStepResponse(Long id, int ordinal, int durationMs, String note, int outs,
                               PlayMarkers markers) {

    public static PlayStepResponse from(final PlayStep step) {
        return new PlayStepResponse(step.getId(), step.getOrdinal(), step.getDurationMs(),
                step.getNote(), step.getOuts(), step.getMarkers());
    }
}
