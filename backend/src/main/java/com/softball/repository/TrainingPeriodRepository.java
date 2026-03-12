package com.softball.repository;

import com.softball.entity.TrainingPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingPeriodRepository extends JpaRepository<TrainingPeriod, Long> {

    List<TrainingPeriod> findAllByOrderByStartDateDesc();
}
