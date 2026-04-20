package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.AtBatEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseState;
import com.softball.domain.model.Game;
import org.springframework.stereotype.Component;

@Component
public class AtBatMapper {

    private final PlayerMapper playerMapper;

    public AtBatMapper(final PlayerMapper playerMapper) {
        this.playerMapper = playerMapper;
    }

    public AtBat toDomain(final AtBatEntity entity) {
        if (entity == null) return null;
        final AtBat ab = new AtBat();
        ab.setId(entity.getId());
        final Game game = new Game();
        game.setId(entity.getGame().getId());
        ab.setGame(game);
        ab.setBatter(playerMapper.toDomain(entity.getBatter()));
        ab.setSequence(entity.getSequence());
        ab.setInning(entity.getInning());
        ab.setResult(entity.getResult());
        ab.setBaseStateAfter(new BaseState(
            entity.getRunnerFirst() != null ? entity.getRunnerFirst().getId() : null,
            entity.getRunnerSecond() != null ? entity.getRunnerSecond().getId() : null,
            entity.getRunnerThird() != null ? entity.getRunnerThird().getId() : null
        ));
        ab.setRunsScored(entity.getRunsScored());
        ab.setRbi(entity.getRbi());
        ab.setCreatedAt(entity.getCreatedAt());
        ab.setCreatedBy(entity.getCreatedBy());
        return ab;
    }

    public AtBatEntity toEntity(final AtBat domain,
                                 final GameEntity gameEntity,
                                 final PlayerEntity batterEntity,
                                 final PlayerEntity runnerFirst,
                                 final PlayerEntity runnerSecond,
                                 final PlayerEntity runnerThird) {
        final AtBatEntity entity = new AtBatEntity();
        entity.setId(domain.getId());
        entity.setGame(gameEntity);
        entity.setBatter(batterEntity);
        entity.setSequence(domain.getSequence());
        entity.setInning(domain.getInning());
        entity.setResult(domain.getResult());
        entity.setRunnerFirst(runnerFirst);
        entity.setRunnerSecond(runnerSecond);
        entity.setRunnerThird(runnerThird);
        entity.setRunsScored(domain.getRunsScored() != null ? domain.getRunsScored() : 0);
        entity.setRbi(domain.getRbi() != null ? domain.getRbi() : 0);
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCreatedBy(domain.getCreatedBy());
        return entity;
    }
}
