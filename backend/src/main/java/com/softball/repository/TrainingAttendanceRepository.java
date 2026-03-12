package com.softball.repository;

import com.softball.entity.TrainingAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingAttendanceRepository extends JpaRepository<TrainingAttendance, Long> {

    List<TrainingAttendance> findByTrainingId(Long trainingId);

    List<TrainingAttendance> findByTrainingIdIn(List<Long> trainingIds);

    void deleteByTrainingId(Long trainingId);
}
