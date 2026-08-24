package com.softball.adapter.dto;

import com.softball.domain.model.LineupSetGameRotation;

/** Coach-Rotation eines Spiels im Set — Pair-Namen wie am Game (POS_1_6 …). */
public record LineupSetGameRotationResponse(Integer gameNumber,
                                            String firstBaseCoachRotation,
                                            boolean firstBaseCoachRotationReversed,
                                            String thirdBaseCoachRotation,
                                            boolean thirdBaseCoachRotationReversed) {
    public static LineupSetGameRotationResponse from(final LineupSetGameRotation r) {
        return new LineupSetGameRotationResponse(
            r.getGameNumber(),
            r.getFirstBase() != null ? r.getFirstBase().name() : null,
            r.isFirstBaseReversed(),
            r.getThirdBase() != null ? r.getThirdBase().name() : null,
            r.isThirdBaseReversed()
        );
    }
}
