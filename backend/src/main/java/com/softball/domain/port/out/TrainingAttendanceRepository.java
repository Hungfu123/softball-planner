package com.softball.domain.port.out;

import com.softball.domain.model.TrainingAttendance;
import java.util.List;

public interface TrainingAttendanceRepository {
    List<TrainingAttendance> findByTrainingId(Long trainingId);
    List<TrainingAttendance> findByTrainingIdIn(List<Long> trainingIds);
    void deleteByTrainingId(Long trainingId);
    void deleteByPlayerId(Long playerId);
    void deleteByTrainingIds(List<Long> trainingIds);
    List<TrainingAttendance> saveAll(List<TrainingAttendance> attendances);
}
