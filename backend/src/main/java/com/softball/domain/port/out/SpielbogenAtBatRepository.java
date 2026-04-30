package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;

import java.util.List;
import java.util.Optional;

public interface SpielbogenAtBatRepository {
    List<SpielbogenAtBat> findByBogenId(Long bogenId);
    List<SpielbogenAtBat> findByBogenIdAndSide(Long bogenId, BogenSide side);
    Optional<SpielbogenAtBat> findById(Long id);
    Optional<SpielbogenAtBat> findLatestForSide(Long bogenId, BogenSide side);
    SpielbogenAtBat save(SpielbogenAtBat atBat);
    void deleteById(Long id);
    Integer findMaxSequenceForBogenSide(Long bogenId, BogenSide side);
    long countOutsInInning(Long bogenId, BogenSide side, Integer inning);
}
