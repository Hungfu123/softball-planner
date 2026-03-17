package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Player;
import org.springframework.stereotype.Component;

@Component
public class PlayerMapper {

    public Player toDomain(final PlayerEntity entity) {
        if (entity == null) return null;
        return new Player(entity.getId(), entity.getName(), entity.isRegular(), entity.getDefaultBattingOrder());
    }

    public PlayerEntity toEntity(final Player domain) {
        if (domain == null) return null;
        final PlayerEntity entity = new PlayerEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setRegular(domain.isRegular());
        entity.setDefaultBattingOrder(domain.getDefaultBattingOrder());
        return entity;
    }

    public void updateEntity(final PlayerEntity entity, final Player domain) {
        entity.setName(domain.getName());
        entity.setRegular(domain.isRegular());
        entity.setDefaultBattingOrder(domain.getDefaultBattingOrder());
    }
}
