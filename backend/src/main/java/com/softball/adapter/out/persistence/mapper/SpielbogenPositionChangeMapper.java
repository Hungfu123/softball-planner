package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenPositionChange;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenPositionChangeMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenPositionChangeMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenPositionChange toDomain(final SpielbogenPositionChangeEntity e) {
        if (e == null) return null;
        SpielbogenPositionChange c = new SpielbogenPositionChange();
        c.setId(e.getId());
        c.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        c.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        c.setSide(BogenSide.valueOf(e.getSide()));
        c.setInning(e.getInning());
        c.setGroupId(e.getGroupId());
        c.setOldPosition(e.getOldPosition());
        c.setNewPosition(e.getNewPosition());
        c.setCreatedAt(e.getCreatedAt());
        return c;
    }

    public SpielbogenPositionChangeEntity toEntity(final SpielbogenPositionChange c, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenPositionChangeEntity e = new SpielbogenPositionChangeEntity();
        e.setId(c.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(c.getSide().name());
        e.setInning(c.getInning());
        e.setGroupId(c.getGroupId());
        e.setOldPosition(c.getOldPosition());
        e.setNewPosition(c.getNewPosition());
        return e;
    }
}
