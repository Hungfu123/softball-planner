package com.softball.domain.port.out;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;

import java.util.List;
import java.util.Optional;

public interface SpielbogenSlotRepository {
    List<SpielbogenSlot> findByBogenId(Long bogenId);
    List<SpielbogenSlot> findByBogenIdAndSide(Long bogenId, BogenSide side);
    Optional<SpielbogenSlot> findById(Long id);
    SpielbogenSlot save(SpielbogenSlot slot);
    List<SpielbogenSlot> saveAll(List<SpielbogenSlot> slots);
    void deleteByBogenIdAndSide(Long bogenId, BogenSide side);
}
