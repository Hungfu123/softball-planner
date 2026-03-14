package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.GameStaffEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringGameStaffRepository extends JpaRepository<GameStaffEntity, Long> {

    @Query("SELECT gs FROM GameStaffEntity gs JOIN FETCH gs.player WHERE gs.game.id = :gameId")
    List<GameStaffEntity> findByGameId(Long gameId);

    @Query("SELECT gs FROM GameStaffEntity gs JOIN FETCH gs.player JOIN FETCH gs.game WHERE gs.game.id IN :gameIds")
    List<GameStaffEntity> findByGameIdIn(List<Long> gameIds);

    @Modifying
    @Query("DELETE FROM GameStaffEntity gs WHERE gs.game.id = :gameId")
    void deleteByGameId(Long gameId);
}
