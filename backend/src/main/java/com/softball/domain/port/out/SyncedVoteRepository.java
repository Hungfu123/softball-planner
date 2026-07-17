package com.softball.domain.port.out;

import com.softball.domain.model.SyncedVote;

import java.util.List;
import java.util.Optional;

public interface SyncedVoteRepository {
    Optional<SyncedVote> findByTrainingIdAndVoterName(Long trainingId, String voterName);
    List<SyncedVote> findByTrainingId(Long trainingId);
    List<SyncedVote> findByVoterNameAndPlayerIdIsNull(String voterName);
    List<SyncedVote> findByPlayerIdIsNull();
    SyncedVote save(SyncedVote vote);
}
