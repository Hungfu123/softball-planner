package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.CarEntity;
import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Car;
import org.springframework.stereotype.Component;

@Component
public class CarMapper {

    private final PlayerMapper playerMapper;

    public CarMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public Car toDomain(final CarEntity entity) {
        if (entity == null) return null;
        final com.softball.domain.model.GameDay gd = new com.softball.domain.model.GameDay();
        gd.setId(entity.getGameDay().getId());
        return new Car(entity.getId(), gd, playerMapper.toDomain(entity.getDriver()), entity.getTotalSeats(), entity.getDirection());
    }

    public CarEntity toEntity(final Car domain, final GameDayEntity gameDayEntity, final PlayerEntity driverEntity) {
        final CarEntity entity = new CarEntity(gameDayEntity, driverEntity, domain.getTotalSeats(), domain.getDirection());
        entity.setId(domain.getId());
        return entity;
    }
}
