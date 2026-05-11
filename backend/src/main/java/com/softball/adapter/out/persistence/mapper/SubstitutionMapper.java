package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SubstitutionEntity;
import com.softball.domain.model.Game;
import com.softball.domain.model.Substitution;
import org.springframework.stereotype.Component;

@Component
public class SubstitutionMapper {

    private final PlayerMapper playerMapper;

    public SubstitutionMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public Substitution toDomain(final SubstitutionEntity entity) {
        if (entity == null) return null;
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        final Substitution sub = new Substitution(
            game,
            playerMapper.toDomain(entity.getPlayerOut()),
            playerMapper.toDomain(entity.getPlayerIn()),
            entity.getInning()
        );
        sub.setId(entity.getId());
        sub.setCreatedAt(entity.getCreatedAt());
        return sub;
    }

    public SubstitutionEntity toEntity(final Substitution domain, final GameEntity gameEntity,
                                        final PlayerEntity playerOutEntity, final PlayerEntity playerInEntity) {
        final SubstitutionEntity entity = new SubstitutionEntity(gameEntity, playerOutEntity, playerInEntity, domain.getInning());
        entity.setId(domain.getId());
        entity.setCreatedAt(domain.getCreatedAt());
        return entity;
    }
}
