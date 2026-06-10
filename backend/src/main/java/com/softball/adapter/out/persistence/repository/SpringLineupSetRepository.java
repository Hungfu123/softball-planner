package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringLineupSetRepository extends JpaRepository<LineupSetEntity, Long> {

    List<LineupSetEntity> findByGameDayIdOrderBySortOrderAsc(Long gameDayId);

    @Query("SELECT COALESCE(MAX(s.sortOrder), -1) FROM LineupSetEntity s WHERE s.gameDayId = :gameDayId")
    int maxSortOrder(Long gameDayId);
}
