package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.Training;
import org.springframework.stereotype.Component;

@Component
public class TrainingMapper {

    private final TrainingPeriodMapper periodMapper;

    public TrainingMapper(final TrainingPeriodMapper periodMapper) {
        this.periodMapper = periodMapper;
    }

    public Training toDomain(final TrainingEntity entity) {
        if (entity == null) return null;
        final Training t = new Training(entity.getId(), entity.getDate(), entity.getTime(), entity.getLocation());
        t.setCancelled(entity.isCancelled());
        t.setType(entity.getType());
        t.setOpenToAll(entity.isOpenToAll());
        t.setPeriod(periodMapper.toDomain(entity.getPeriod()));
        return t;
    }

    public TrainingEntity toEntity(final Training domain, final TrainingPeriodEntity periodEntity) {
        final TrainingEntity entity = new TrainingEntity(domain.getDate(), domain.getTime(), domain.getLocation());
        entity.setId(domain.getId());
        entity.setCancelled(domain.isCancelled());
        entity.setType(domain.getType() != null ? domain.getType() : "REGULAR");
        entity.setOpenToAll(domain.isOpenToAll());
        entity.setPeriod(periodEntity);
        return entity;
    }

    public void updateEntity(final TrainingEntity entity, final Training domain) {
        entity.setDate(domain.getDate());
        entity.setTime(domain.getTime());
        entity.setLocation(domain.getLocation());
        entity.setCancelled(domain.isCancelled());
        entity.setType(domain.getType() != null ? domain.getType() : "REGULAR");
        entity.setOpenToAll(domain.isOpenToAll());
    }
}
