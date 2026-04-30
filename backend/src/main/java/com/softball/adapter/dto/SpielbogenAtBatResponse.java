package com.softball.adapter.dto;

import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.OutType;
import com.softball.domain.model.SpielbogenAtBat;

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
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    Integer runsScored,
    Integer rbi,
    BogenBaseStateDto baseStateAfter,
    Instant createdAt
) {
    public static SpielbogenAtBatResponse from(final SpielbogenAtBat a) {
        return new SpielbogenAtBatResponse(
            a.getId(),
            a.getBogen() != null ? a.getBogen().getId() : null,
            a.getSlot() != null ? a.getSlot().getId() : null,
            a.getSide(),
            a.getSequence(),
            a.getInning(),
            a.getResult(),
            a.getOutType(),
            a.getFielderChain(),
            a.getIsError(),
            a.getErrorPosition(),
            a.getRunsScored(),
            a.getRbi(),
            a.getBaseStateAfter() != null ? new BogenBaseStateDto(
                a.getBaseStateAfter().getFirstSlotId(),
                a.getBaseStateAfter().getSecondSlotId(),
                a.getBaseStateAfter().getThirdSlotId()
            ) : null,
            a.getCreatedAt()
        );
    }
}
