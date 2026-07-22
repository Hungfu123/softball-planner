package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.AutomaticOutEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpringAutomaticOutEventRepository extends JpaRepository<AutomaticOutEventEntity, Long> {

    @Query("SELECT e FROM AutomaticOutEventEntity e WHERE e.game.id = :gameId ORDER BY e.createdAt ASC")
    List<AutomaticOutEventEntity> findByGameIdOrderByCreatedAtAsc(Long gameId);
}
