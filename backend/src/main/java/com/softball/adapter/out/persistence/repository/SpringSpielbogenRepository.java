package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringSpielbogenRepository extends JpaRepository<SpielbogenEntity, Long> {

    @Query("SELECT b FROM SpielbogenEntity b WHERE b.season.id = :seasonId ORDER BY b.date DESC")
    List<SpielbogenEntity> findBySeasonIdOrderByDateDesc(Long seasonId);

    @Query("SELECT b FROM SpielbogenEntity b WHERE b.status = :status ORDER BY b.date DESC")
    List<SpielbogenEntity> findByStatusOrderByDateDesc(String status);

    List<SpielbogenEntity> findAllByOrderByDateDesc();
}
