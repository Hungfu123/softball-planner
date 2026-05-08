package com.softball.adapter.dto;

import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.OutType;
import com.softball.domain.model.SacrificeType;
import com.softball.domain.model.SpielbogenAtBat;
import com.softball.domain.model.SpielbogenRunnerAdvance;

import java.time.Instant;
import java.util.List;

public record SpielbogenAtBatResponse(
    Long id,
    Long bogenId,
    Long slotId,
    BogenSide side,
    Integer sequence,
    Integer inning,
    AtBatResult result,
    OutType outType,
    SacrificeType sacrificeType,
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    Integer runsScored,
    Integer rbi,
    BogenBaseStateDto baseStateAfter,
    Instant createdAt,
    List<SpielbogenRunnerAdvanceResponse> runnerAdvances
) {
    public static SpielbogenAtBatResponse from(final SpielbogenAtBat ab) {
        return from(ab, java.util.List.of());
    }

    public static SpielbogenAtBatResponse from(final SpielbogenAtBat ab, final List<SpielbogenRunnerAdvance> advances) {
        return new SpielbogenAtBatResponse(
            ab.getId(),
            ab.getBogen() != null ? ab.getBogen().getId() : null,
            ab.getSlot() != null ? ab.getSlot().getId() : null,
            ab.getSide(),
            ab.getSequence(),
            ab.getInning(),
            ab.getResult(),
            ab.getOutType(),
            ab.getSacrificeType(),
            ab.getFielderChain(),
            ab.getIsError(),
            ab.getErrorPosition(),
            ab.getRunsScored(),
            ab.getRbi(),
            ab.getBaseStateAfter() != null ? new BogenBaseStateDto(
                ab.getBaseStateAfter().getFirstSlotId(),
                ab.getBaseStateAfter().getSecondSlotId(),
                ab.getBaseStateAfter().getThirdSlotId()
            ) : null,
            ab.getCreatedAt(),
            advances == null ? java.util.List.of() : advances.stream().map(SpielbogenRunnerAdvanceResponse::from).toList()
        );
    }
}
