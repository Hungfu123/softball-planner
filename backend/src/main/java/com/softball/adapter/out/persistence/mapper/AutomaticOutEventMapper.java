package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.AutomaticOutEventEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.domain.model.AutomaticOutEvent;
import com.softball.domain.model.Game;
import org.springframework.stereotype.Component;

@Component
public class AutomaticOutEventMapper {

    public AutomaticOutEvent toDomain(final AutomaticOutEventEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final AutomaticOutEvent event = new AutomaticOutEvent(game, entity.getInning(), entity.getCreatedBy());
        event.setId(entity.getId());
        event.setCreatedAt(entity.getCreatedAt());
        return event;
    }

    public AutomaticOutEventEntity toEntity(final AutomaticOutEvent domain, final GameEntity gameEntity) {
        final AutomaticOutEventEntity entity = new AutomaticOutEventEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setInning(domain.getInning());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCreatedBy(domain.getCreatedBy());
        return entity;
    }
}
