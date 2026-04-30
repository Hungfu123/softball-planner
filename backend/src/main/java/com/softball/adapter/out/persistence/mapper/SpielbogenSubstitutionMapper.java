package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSubstitution;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenSubstitutionMapper {

    private final SpielbogenMapper bogenMapper;
    private final SpielbogenSlotMapper slotMapper;

    public SpielbogenSubstitutionMapper(final SpielbogenMapper bogenMapper, final SpielbogenSlotMapper slotMapper) {
        this.bogenMapper = bogenMapper;
        this.slotMapper = slotMapper;
    }

    public SpielbogenSubstitution toDomain(final SpielbogenSubstitutionEntity e) {
        if (e == null) return null;
        SpielbogenSubstitution s = new SpielbogenSubstitution();
        s.setId(e.getId());
        s.setBogen(e.getBogen() != null ? bogenMapper.toDomain(e.getBogen()) : null);
        s.setSlot(e.getSlot() != null ? slotMapper.toDomain(e.getSlot()) : null);
        s.setSide(BogenSide.valueOf(e.getSide()));
        s.setInning(e.getInning());
        s.setPlayerOutName(e.getPlayerOutName());
        s.setPlayerInName(e.getPlayerInName());
        s.setIsPinchHitter(e.getIsPinchHitter());
        s.setCreatedAt(e.getCreatedAt());
        return s;
    }

    public SpielbogenSubstitutionEntity toEntity(final SpielbogenSubstitution s, final SpielbogenEntity bogenEntity, final SpielbogenSlotEntity slotEntity) {
        SpielbogenSubstitutionEntity e = new SpielbogenSubstitutionEntity();
        e.setId(s.getId());
        e.setBogen(bogenEntity);
        e.setSlot(slotEntity);
        e.setSide(s.getSide().name());
        e.setInning(s.getInning());
        e.setPlayerOutName(s.getPlayerOutName());
        e.setPlayerInName(s.getPlayerInName());
        e.setIsPinchHitter(s.getIsPinchHitter() != null ? s.getIsPinchHitter() : Boolean.FALSE);
        return e;
    }
}
