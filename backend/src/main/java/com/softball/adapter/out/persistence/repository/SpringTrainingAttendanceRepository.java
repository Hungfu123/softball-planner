package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingAttendanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringTrainingAttendanceRepository extends JpaRepository<TrainingAttendanceEntity, Long> {

    @Query("SELECT ta FROM TrainingAttendanceEntity ta JOIN FETCH ta.training JOIN FETCH ta.player WHERE ta.training.id = :trainingId")
    List<TrainingAttendanceEntity> findByTrainingId(Long trainingId);

    @Query("SELECT ta FROM TrainingAttendanceEntity ta JOIN FETCH ta.training JOIN FETCH ta.player WHERE ta.training.id IN :trainingIds")
    List<TrainingAttendanceEntity> findByTrainingIdIn(List<Long> trainingIds);

    @Query("SELECT ta FROM TrainingAttendanceEntity ta JOIN FETCH ta.training JOIN FETCH ta.player WHERE ta.player.id = :playerId")
    List<TrainingAttendanceEntity> findByPlayerId(Long playerId);

    @Modifying
    @Query("DELETE FROM TrainingAttendanceEntity ta WHERE ta.training.id = :trainingId")
    void deleteByTrainingId(Long trainingId);

    @Modifying
    @Query("DELETE FROM TrainingAttendanceEntity ta WHERE ta.training.id IN :trainingIds")
    void deleteByTrainingIdIn(List<Long> trainingIds);

    @Modifying
    @Query("DELETE FROM TrainingAttendanceEntity ta WHERE ta.player.id = :playerId")
    void deleteByPlayerId(Long playerId);
}
