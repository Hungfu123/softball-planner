package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SyncedVoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringSyncedVoteRepository extends JpaRepository<SyncedVoteEntity, Long> {
    Optional<SyncedVoteEntity> findByTrainingIdAndVoterName(Long trainingId, String voterName);
    List<SyncedVoteEntity> findByTrainingId(Long trainingId);
    List<SyncedVoteEntity> findByVoterNameAndPlayerIdIsNull(String voterName);
    List<SyncedVoteEntity> findByPlayerIdIsNull();
}
