package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.GameStaffEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.GameStaff;
import org.springframework.stereotype.Component;

@Component
public class GameStaffMapper {

    private final PlayerMapper playerMapper;

    public GameStaffMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public GameStaff toDomain(final GameStaffEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final GameStaff gs = new GameStaff(game, playerMapper.toDomain(entity.getPlayer()), entity.getRole());
        gs.setId(entity.getId());
        return gs;
    }

    public GameStaffEntity toEntity(final GameStaff domain, final GameEntity gameEntity, final PlayerEntity playerEntity) {
        final GameStaffEntity entity = new GameStaffEntity(gameEntity, playerEntity, domain.getRole());
        entity.setId(domain.getId());
        return entity;
    }
}
