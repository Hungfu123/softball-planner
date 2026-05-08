package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.RunnerAdvanceReason;
import com.softball.domain.model.SpielbogenRunnerAdvance;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenRunnerAdvanceMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenAtBatMapper atBatMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenRunnerAdvanceMapper(final SpielbogenMapper bogenMapper,
                                         final SpielbogenAtBatMapper atBatMapper,
                                         final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.atBatMapper = atBatMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenRunnerAdvance toDomain(final SpielbogenRunnerAdvanceEntity e) {
        if (e == null) return null;
        SpielbogenRunnerAdvance a = new SpielbogenRunnerAdvance();
        a.setId(e.getId());
        a.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        a.setAtBat(e.getAtBat() != null ? atBatMapper.toDomain(e.getAtBat()) : null);
        a.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        a.setSide(BogenSide.valueOf(e.getSide()));
        a.setInning(e.getInning());
        a.setFromBase(e.getFromBase());
        a.setToBase(e.getToBase());
        a.setReason(RunnerAdvanceReason.valueOf(e.getReason()));
        a.setCreatedAt(e.getCreatedAt());
        return a;
    }

    public SpielbogenRunnerAdvanceEntity toEntity(final SpielbogenRunnerAdvance a,
                                                   final SpielbogenEntity bogenEntity,
                                                   final SpielbogenAtBatEntity atBatEntity,
                                                   final SpielbogenSlotEntity slotEntity) {
        SpielbogenRunnerAdvanceEntity e = new SpielbogenRunnerAdvanceEntity();
        e.setId(a.getId());
        e.setBogen(bogenEntity);
        e.setAtBat(atBatEntity);
        e.setSlot(slotEntity);
        e.setSide(a.getSide().name());
        e.setInning(a.getInning());
        e.setFromBase(a.getFromBase());
        e.setToBase(a.getToBase());
        e.setReason(a.getReason().name());
        return e;
    }
}
