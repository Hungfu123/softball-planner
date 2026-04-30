package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenSlotMapper {

    private final SpielbogenMapper bogenMapper;

    public SpielbogenSlotMapper(final SpielbogenMapper bogenMapper) {
        this.bogenMapper = bogenMapper;
    }

    public SpielbogenSlot toDomain(final SpielbogenSlotEntity e) {
        if (e == null) return null;
        final SpielbogenSlot s = new SpielbogenSlot();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setSlot(e.getSlot());
        s.setName(e.getName());
        s.setPosition(e.getPosition());
        s.setBattingOrder(e.getBattingOrder());
        return s;
    }

    public SpielbogenSlotEntity toEntity(final SpielbogenSlot s, final SpielbogenEntity bogenEntity) {
        if (s == null) return null;
        final SpielbogenSlotEntity e = new SpielbogenSlotEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        applyToEntity(e, s);
        return e;
    }

    public void updateEntity(final SpielbogenSlotEntity e, final SpielbogenSlot s) {
        applyToEntity(e, s);
    }

    private void applyToEntity(final SpielbogenSlotEntity e, final SpielbogenSlot s) {
        e.setSide(s.getSide().name());
        e.setSlot(s.getSlot());
        e.setName(s.getName());
        e.setPosition(s.getPosition());
        e.setBattingOrder(s.getBattingOrder());
    }
}
