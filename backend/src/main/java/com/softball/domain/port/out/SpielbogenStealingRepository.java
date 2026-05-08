package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;

import java.util.List;
import java.util.Optional;

public interface SpielbogenStealingRepository {
    List<SpielbogenStealingEvent> findByBogenId(Long bogenId);
    Optional<SpielbogenStealingEvent> findById(Long id);
    SpielbogenStealingEvent save(SpielbogenStealingEvent event);
    void deleteById(Long id);
    Optional<SpielbogenStealingEvent> findLatestForBogenIdAndSide(Long bogenId, BogenSide side);
    long countOutsInInning(Long bogenId, BogenSide side, Integer inning);
}
