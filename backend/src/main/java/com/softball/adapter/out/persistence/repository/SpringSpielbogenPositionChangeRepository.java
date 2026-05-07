package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenPositionChangeRepository extends JpaRepository<SpielbogenPositionChangeEntity, Long> {
    List<SpielbogenPositionChangeEntity> findByBogen_IdOrderByInningAscIdAsc(Long bogenId);
    long deleteByGroupId(String groupId);
}
