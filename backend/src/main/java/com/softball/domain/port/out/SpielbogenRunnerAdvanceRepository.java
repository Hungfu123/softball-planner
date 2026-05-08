package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenRunnerAdvance;

import java.util.List;

public interface SpielbogenRunnerAdvanceRepository {
    List<SpielbogenRunnerAdvance> findByBogenId(Long bogenId);
    List<SpielbogenRunnerAdvance> findByAtBatId(Long atBatId);
    SpielbogenRunnerAdvance save(SpielbogenRunnerAdvance advance);
    List<SpielbogenRunnerAdvance> saveAll(List<SpielbogenRunnerAdvance> advances);
    void deleteByAtBatId(Long atBatId);
}
