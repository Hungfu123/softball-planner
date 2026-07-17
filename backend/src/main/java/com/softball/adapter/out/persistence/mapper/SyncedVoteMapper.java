package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.SyncedVoteEntity;
import com.softball.domain.model.SyncedVote;
import org.springframework.stereotype.Component;

@Component
public class SyncedVoteMapper {

    public SyncedVote toDomain(final SyncedVoteEntity entity) {
        if (entity == null) {
            return null;
        }
        final SyncedVote vote = new SyncedVote(
            entity.getTrainingId(), entity.getVoterName(), entity.getPlayerId(), entity.isPresent());
        vote.setId(entity.getId());
        return vote;
    }

    public SyncedVoteEntity toEntity(final SyncedVote domain) {
        if (domain == null) {
            return null;
        }
        final SyncedVoteEntity entity = new SyncedVoteEntity();
        entity.setId(domain.getId());
        entity.setTrainingId(domain.getTrainingId());
        entity.setVoterName(domain.getVoterName());
        entity.setPlayerId(domain.getPlayerId());
        entity.setPresent(domain.isPresent());
        return entity;
    }

    public void updateEntity(final SyncedVoteEntity entity, final SyncedVote domain) {
        entity.setTrainingId(domain.getTrainingId());
        entity.setVoterName(domain.getVoterName());
        entity.setPlayerId(domain.getPlayerId());
        entity.setPresent(domain.isPresent());
    }
}
