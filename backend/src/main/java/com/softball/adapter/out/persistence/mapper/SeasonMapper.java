package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.domain.model.Season;
import org.springframework.stereotype.Component;

@Component
public class SeasonMapper {

    public Season toDomain(final SeasonEntity entity) {
        if (entity == null) return null;
        return new Season(entity.getId(), entity.getName(), entity.getYear());
    }

    public SeasonEntity toEntity(final Season domain) {
        if (domain == null) return null;
        final SeasonEntity entity = new SeasonEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setYear(domain.getYear());
        return entity;
    }

    public void updateEntity(final SeasonEntity entity, final Season domain) {
        entity.setName(domain.getName());
        entity.setYear(domain.getYear());
    }
}
