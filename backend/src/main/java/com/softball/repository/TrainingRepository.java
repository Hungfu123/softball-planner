package com.softball.repository;

import com.softball.entity.Training;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    List<Training> findAllByOrderByDateDesc();

    long countByCancelledFalse();

    List<Training> findByDateIn(Set<LocalDate> dates);

    List<Training> findByPeriodIdOrderByDateDesc(Long periodId);

    boolean existsByDate(LocalDate date);

    java.util.Optional<Training> findByDate(LocalDate date);
}
