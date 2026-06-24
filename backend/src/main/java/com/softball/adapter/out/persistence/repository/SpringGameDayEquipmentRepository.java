package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameDayEquipmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SpringGameDayEquipmentRepository extends JpaRepository<GameDayEquipmentEntity, Long> {

    @Query("SELECT e.item.id FROM GameDayEquipmentEntity e WHERE e.gameDay.id = :gameDayId")
    List<Long> findItemIdsByGameDayId(@Param("gameDayId") Long gameDayId);

    boolean existsByGameDay_IdAndItem_Id(Long gameDayId, Long itemId);

    void deleteByGameDay_IdAndItem_Id(Long gameDayId, Long itemId);

    @Query("SELECT e.gameDay.id FROM GameDayEquipmentEntity e "
        + "WHERE e.gameDay.season.id = :seasonId AND e.gameDay.date < :date "
        + "GROUP BY e.gameDay.id, e.gameDay.date "
        + "ORDER BY e.gameDay.date DESC")
    List<Long> findGameDayIdsWithUsageBefore(@Param("seasonId") Long seasonId, @Param("date") LocalDate date);
}
