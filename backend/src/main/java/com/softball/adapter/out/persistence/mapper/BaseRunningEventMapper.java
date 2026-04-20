package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.BaseRunningEventEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.Game;
import org.springframework.stereotype.Component;

@Component
public class BaseRunningEventMapper {

    private final PlayerMapper playerMapper;

    public BaseRunningEventMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public BaseRunningEvent toDomain(final BaseRunningEventEntity entity) {
        if (entity == null) return null;
        final BaseRunningEvent e = new BaseRunningEvent();
        e.setId(entity.getId());
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        e.setGame(game);
        e.setRunner(playerMapper.toDomain(entity.getRunner()));
        e.setInning(entity.getInning());
        e.setType(entity.getType());
        e.setCreatedAt(entity.getCreatedAt());
        return e;
    }

    public BaseRunningEventEntity toEntity(final BaseRunningEvent domain,
                                            final GameEntity gameEntity,
                                            final PlayerEntity runnerEntity) {
        final BaseRunningEventEntity entity = new BaseRunningEventEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setRunner(runnerEntity);
        entity.setInning(domain.getInning());
        entity.setType(domain.getType());
        entity.setCreatedAt(domain.getCreatedAt());
        return entity;
    }
}
