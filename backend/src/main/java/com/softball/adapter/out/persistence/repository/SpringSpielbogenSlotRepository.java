package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringSpielbogenSlotRepository extends JpaRepository<SpielbogenSlotEntity, Long> {

    List<SpielbogenSlotEntity> findByBogen_IdOrderByBattingOrderAsc(Long bogenId);

    List<SpielbogenSlotEntity> findByBogen_IdAndSideOrderByBattingOrderAsc(Long bogenId, String side);

    void deleteByBogen_IdAndSide(Long bogenId, String side);
}
