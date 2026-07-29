package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.SyncedVoteMapper;
import com.softball.adapter.out.persistence.repository.SpringSyncedVoteRepository;
import com.softball.domain.model.SyncedVote;
import com.softball.domain.port.out.SyncedVoteRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SyncedVoteRepositoryAdapter implements SyncedVoteRepository {

    private final SpringSyncedVoteRepository repo;
    private final SyncedVoteMapper mapper;

    public SyncedVoteRepositoryAdapter(final SpringSyncedVoteRepository repo, final SyncedVoteMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public Optional<SyncedVote> findByTrainingIdAndVoterName(final Long trainingId, final String voterName) {
        return repo.findByTrainingIdAndVoterName(trainingId, voterName).map(mapper::toDomain);
    }

    @Override
    public List<SyncedVote> findByTrainingId(final Long trainingId) {
        return repo.findByTrainingId(trainingId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SyncedVote> findByGameDayIdAndVoterName(final Long gameDayId, final String voterName) {
        return repo.findByGameDayIdAndVoterName(gameDayId, voterName).map(mapper::toDomain);
    }

    @Override
    public List<SyncedVote> findByGameDayId(final Long gameDayId) {
        return repo.findByGameDayId(gameDayId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SyncedVote> findByVoterNameAndPlayerIdIsNull(final String voterName) {
        return repo.findByVoterNameAndPlayerIdIsNull(voterName).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SyncedVote> findByPlayerIdIsNull() {
        return repo.findByPlayerIdIsNull().stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SyncedVote> findByPlayerId(final Long playerId) {
        return repo.findByPlayerId(playerId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public SyncedVote save(final SyncedVote vote) {
        if (vote.getId() != null) {
            final var existing = repo.findById(vote.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, vote);
                return mapper.toDomain(repo.save(existing));
            }
        }
        final var entity = mapper.toEntity(vote);
        return mapper.toDomain(repo.save(entity));
    }
}
