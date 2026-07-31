package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SpringSpielbogenAtBatRepository extends JpaRepository<SpielbogenAtBatEntity, Long> {
    List<SpielbogenAtBatEntity> findByBogen_IdOrderBySequenceAsc(Long bogenId);
    List<SpielbogenAtBatEntity> findByBogen_IdAndSideOrderBySequenceAsc(Long bogenId, String side);

    @Query("SELECT MAX(a.sequence) FROM SpielbogenAtBatEntity a WHERE a.bogen.id = :bogenId AND a.side = :side")
    Integer findMaxSequence(Long bogenId, String side);

    Optional<SpielbogenAtBatEntity> findFirstByBogen_IdAndSideOrderBySequenceDesc(Long bogenId, String side);

    @Query("""
        SELECT COALESCE(SUM(CASE
            WHEN a.outType = 'DOUBLE_PLAY' THEN 2
            WHEN a.outType = 'TRIPLE_PLAY' THEN 3
            WHEN a.result = 'STRIKEOUT' THEN 1
            WHEN a.result = 'OUT' THEN 1
            WHEN a.result = 'AUTOMATIC_OUT' THEN 1
            ELSE 0
        END), 0)
        FROM SpielbogenAtBatEntity a
        WHERE a.bogen.id = :bogenId AND a.side = :side AND a.inning = :inning
          AND (a.isError = FALSE OR a.isError IS NULL)
    """)
    long countWeightedOutsInInning(Long bogenId, String side, Integer inning);
}
