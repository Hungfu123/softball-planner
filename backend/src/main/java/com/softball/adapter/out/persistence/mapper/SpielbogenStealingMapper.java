package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenStealingMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenStealingMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenStealingEvent toDomain(final SpielbogenStealingEventEntity e) {
        if (e == null) return null;
        SpielbogenStealingEvent s = new SpielbogenStealingEvent();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setInning(e.getInning());
        s.setType(StealingEventType.valueOf(e.getType()));
        s.setFromBase(e.getFromBase());
        s.setToBase(e.getToBase());
        s.setCreatedAt(e.getCreatedAt());
        return s;
    }

    public SpielbogenStealingEventEntity toEntity(final SpielbogenStealingEvent s, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenStealingEventEntity e = new SpielbogenStealingEventEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(s.getSide().name());
        e.setInning(s.getInning());
        e.setType(s.getType().name());
        e.setFromBase(s.getFromBase());
        e.setToBase(s.getToBase());
        return e;
    }
}
