package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenRunnerAdvanceRepository extends JpaRepository<SpielbogenRunnerAdvanceEntity, Long> {
    List<SpielbogenRunnerAdvanceEntity> findByBogen_IdOrderByIdAsc(Long bogenId);
    List<SpielbogenRunnerAdvanceEntity> findByAtBat_IdOrderByIdAsc(Long atBatId);
    void deleteByAtBat_Id(Long atBatId);
}
