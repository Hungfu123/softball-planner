package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SpielbogenAtBatMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenAtBatMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenAtBat toDomain(final SpielbogenAtBatEntity e) {
        if (e == null) return null;
        SpielbogenAtBat a = new SpielbogenAtBat();
        a.setId(e.getId());
        a.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        a.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        a.setSide(BogenSide.valueOf(e.getSide()));
        a.setSequence(e.getSequence());
        a.setInning(e.getInning());
        a.setResult(AtBatResult.valueOf(e.getResult()));
        a.setOutType(e.getOutType() != null ? OutType.valueOf(e.getOutType()) : null);
        a.setSacrificeType(e.getSacrificeType() != null ? SacrificeType.valueOf(e.getSacrificeType()) : null);
        a.setFielderChain(e.getFielderChain() != null ? Arrays.asList(e.getFielderChain()) : null);
        a.setIsError(e.getIsError());
        a.setErrorPosition(e.getErrorPosition());
        a.setRunsScored(e.getRunsScored());
        a.setRbi(e.getRbi());
        a.setBaseStateAfter(new BogenBaseState(e.getBaseStateFirst(), e.getBaseStateSecond(), e.getBaseStateThird()));
        a.setCreatedAt(e.getCreatedAt());
        a.setCreatedBy(e.getCreatedBy());
        return a;
    }

    public SpielbogenAtBatEntity toEntity(final SpielbogenAtBat a, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenAtBatEntity e = new SpielbogenAtBatEntity();
        e.setId(a.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        applyToEntity(e, a);
        return e;
    }

    public void updateEntity(final SpielbogenAtBatEntity e, final SpielbogenAtBat a) {
        applyToEntity(e, a);
    }

    private void applyToEntity(final SpielbogenAtBatEntity e, final SpielbogenAtBat a) {
        e.setSide(a.getSide().name());
        e.setSequence(a.getSequence());
        e.setInning(a.getInning());
        e.setResult(a.getResult().name());
        e.setOutType(a.getOutType() != null ? a.getOutType().name() : null);
        e.setSacrificeType(a.getSacrificeType() != null ? a.getSacrificeType().name() : null);
        e.setFielderChain(a.getFielderChain() != null ? a.getFielderChain().toArray(new Integer[0]) : null);
        e.setIsError(a.getIsError() != null ? a.getIsError() : Boolean.FALSE);
        e.setErrorPosition(a.getErrorPosition());
        e.setRunsScored(a.getRunsScored() != null ? a.getRunsScored() : 0);
        e.setRbi(a.getRbi() != null ? a.getRbi() : 0);
        if (a.getBaseStateAfter() != null) {
            e.setBaseStateFirst(a.getBaseStateAfter().getFirstSlotId());
            e.setBaseStateSecond(a.getBaseStateAfter().getSecondSlotId());
            e.setBaseStateThird(a.getBaseStateAfter().getThirdSlotId());
        }
        e.setCreatedBy(a.getCreatedBy());
    }
}
