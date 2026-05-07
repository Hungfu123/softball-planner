package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenPositionChange;

import java.util.List;
import java.util.Optional;

public interface SpielbogenPositionChangeRepository {
    List<SpielbogenPositionChange> findByBogenId(Long bogenId);
    Optional<SpielbogenPositionChange> findById(Long id);
    SpielbogenPositionChange save(SpielbogenPositionChange change);
    void deleteById(Long id);
    void deleteByGroupId(String groupId);
}
