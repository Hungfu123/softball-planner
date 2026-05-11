package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.InningAdvanceEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringInningAdvanceEventRepository extends JpaRepository<InningAdvanceEventEntity, Long> {

    @Query("SELECT e FROM InningAdvanceEventEntity e WHERE e.game.id = :gameId ORDER BY e.createdAt ASC")
    List<InningAdvanceEventEntity> findByGameIdOrderByCreatedAtAsc(Long gameId);
}
