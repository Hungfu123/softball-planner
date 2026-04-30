package com.softball.domain.port.out;

import com.softball.domain.model.SpielbogenSubstitution;

import java.util.List;
import java.util.Optional;

public interface SpielbogenSubstitutionRepository {
    List<SpielbogenSubstitution> findByBogenId(Long bogenId);
    Optional<SpielbogenSubstitution> findById(Long id);
    SpielbogenSubstitution save(SpielbogenSubstitution sub);
    void deleteById(Long id);
}
