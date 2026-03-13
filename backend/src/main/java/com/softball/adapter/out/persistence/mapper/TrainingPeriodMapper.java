package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.TrainingPeriod;
import org.springframework.stereotype.Component;

@Component
public class TrainingPeriodMapper {

    public TrainingPeriod toDomain(final TrainingPeriodEntity entity) {
        if (entity == null) return null;
        return new TrainingPeriod(entity.getId(), entity.getName(), entity.getStartDate(), entity.getEndDate());
    }

    public TrainingPeriodEntity toEntity(final TrainingPeriod domain) {
        final TrainingPeriodEntity entity = new TrainingPeriodEntity(domain.getName(), domain.getStartDate(), domain.getEndDate());
        entity.setId(domain.getId());
        return entity;
    }

    public void updateEntity(final TrainingPeriodEntity entity, final TrainingPeriod domain) {
        entity.setName(domain.getName());
        entity.setStartDate(domain.getStartDate());
        entity.setEndDate(domain.getEndDate());
    }
}
