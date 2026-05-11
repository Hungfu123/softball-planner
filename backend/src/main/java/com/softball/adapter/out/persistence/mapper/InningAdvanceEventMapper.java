package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.InningAdvanceEventEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.InningAdvanceEvent;
import org.springframework.stereotype.Component;

@Component
public class InningAdvanceEventMapper {

    public InningAdvanceEvent toDomain(final InningAdvanceEventEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final InningAdvanceEvent event = new InningAdvanceEvent(
            game, entity.getToInning(), entity.getOpponentRuns(), entity.getCreatedBy()
        );
        event.setId(entity.getId());
        event.setCreatedAt(entity.getCreatedAt());
        return event;
    }

    public InningAdvanceEventEntity toEntity(final InningAdvanceEvent domain, final GameEntity gameEntity) {
        final InningAdvanceEventEntity entity = new InningAdvanceEventEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setToInning(domain.getToInning());
        entity.setOpponentRuns(domain.getOpponentRuns());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCreatedBy(domain.getCreatedBy());
        return entity;
    }
}
