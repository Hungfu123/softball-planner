package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.CarEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringCarRepository extends JpaRepository<CarEntity, Long> {

    @Query("SELECT c FROM CarEntity c JOIN FETCH c.driver WHERE c.gameDay.id = :gameDayId")
    List<CarEntity> findByGameDay_Id(Long gameDayId);

    @Modifying
    @Query("DELETE FROM CarEntity c WHERE c.gameDay.id = :gameDayId")
    void deleteByGameDay_Id(Long gameDayId);
}
