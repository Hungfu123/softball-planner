package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenSubstitutionRepository extends JpaRepository<SpielbogenSubstitutionEntity, Long> {
    List<SpielbogenSubstitutionEntity> findByBogen_IdOrderByInningAscIdAsc(Long bogenId);
}
