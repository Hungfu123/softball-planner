package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringSpielbogenStealingRepository extends JpaRepository<SpielbogenStealingEventEntity, Long> {
    List<SpielbogenStealingEventEntity> findByBogen_IdOrderByIdAsc(Long bogenId);

    @Query("""
        SELECT COUNT(s) FROM SpielbogenStealingEventEntity s
        WHERE s.bogen.id = :bogenId AND s.side = :side AND s.inning = :inning
          AND (s.type = 'CAUGHT_STEALING' OR s.type = 'OUT_ON_PLAY')
    """)
    long countOutsInInning(Long bogenId, String side, Integer inning);
}
