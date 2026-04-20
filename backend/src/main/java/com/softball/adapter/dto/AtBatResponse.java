package com.softball.adapter.dto;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseState;

import java.time.Instant;

public record AtBatResponse(
    Long id,
    Long gameId,
    Long batterId,
    String batterName,
    Integer sequence,
    Integer inning,
    AtBatResult result,
    BaseStateDto baseStateAfter,
    Integer runsScored,
    Integer rbi,
    Instant createdAt,
    String createdBy
) {
    public record BaseStateDto(Long first, Long second, Long third) {}

    public static AtBatResponse from(final AtBat ab) {
        final BaseState s = ab.getBaseStateAfter();
        return new AtBatResponse(
            ab.getId(),
            ab.getGame() != null ? ab.getGame().getId() : null,
            ab.getBatter() != null ? ab.getBatter().getId() : null,
            ab.getBatter() != null ? ab.getBatter().getName() : null,
            ab.getSequence(),
            ab.getInning(),
            ab.getResult(),
            s != null ? new BaseStateDto(s.first(), s.second(), s.third()) : new BaseStateDto(null, null, null),
            ab.getRunsScored(),
            ab.getRbi(),
            ab.getCreatedAt(),
            ab.getCreatedBy()
        );
    }
}
