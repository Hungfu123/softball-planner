package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.TrainingAttendanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringTrainingAttendanceRepository extends JpaRepository<TrainingAttendanceEntity, Long> {

    @Query("SELECT ta FROM TrainingAttendanceEntity ta JOIN FETCH ta.training JOIN FETCH ta.player WHERE ta.training.id = :trainingId")
    List<TrainingAttendanceEntity> findByTrainingId(Long trainingId);

    @Query("SELECT ta FROM TrainingAttendanceEntity ta JOIN FETCH ta.training JOIN FETCH ta.player WHERE ta.training.id IN :trainingIds")
    List<TrainingAttendanceEntity> findByTrainingIdIn(List<Long> trainingIds);

    void deleteByTrainingId(Long trainingId);

    void deleteByTrainingIdIn(List<Long> trainingIds);
}
