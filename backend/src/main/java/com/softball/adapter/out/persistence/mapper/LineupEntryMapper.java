package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.LineupEntryEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import org.springframework.stereotype.Component;

@Component
public class LineupEntryMapper {

    private final PlayerMapper playerMapper;

    public LineupEntryMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public LineupEntry toDomain(final LineupEntryEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final LineupEntry le = new LineupEntry(
            game,
            playerMapper.toDomain(entity.getPlayer()),
            entity.getPosition(),
            entity.getBattingOrder()
        );
        le.setId(entity.getId());
        le.setDhBatterPlayer(playerMapper.toDomain(entity.getDhBatterPlayer()));
        return le;
    }

    public LineupEntryEntity toEntity(final LineupEntry domain, final GameEntity gameEntity, final PlayerEntity playerEntity, final PlayerEntity dhBatterEntity) {
        final LineupEntryEntity entity = new LineupEntryEntity(gameEntity, playerEntity, domain.getPosition(), domain.getBattingOrder(), dhBatterEntity);
        entity.setId(domain.getId());
        return entity;
    }
}
