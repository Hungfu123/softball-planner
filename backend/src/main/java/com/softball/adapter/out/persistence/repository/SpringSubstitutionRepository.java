package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.SubstitutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SpringSubstitutionRepository extends JpaRepository<SubstitutionEntity, Long> {

    @Query("SELECT s FROM SubstitutionEntity s JOIN FETCH s.playerOut JOIN FETCH s.playerIn WHERE s.game.id = :gameId ORDER BY s.inning ASC")
    List<SubstitutionEntity> findByGameIdOrderByInningAsc(Long gameId);

    @Query("SELECT s FROM SubstitutionEntity s JOIN FETCH s.playerOut JOIN FETCH s.playerIn JOIN FETCH s.game WHERE s.game.id IN :gameIds ORDER BY s.inning ASC")
    List<SubstitutionEntity> findByGameIdInOrderByInningAsc(List<Long> gameIds);

    @Modifying
    @Query("DELETE FROM SubstitutionEntity s WHERE s.game.id = :gameId")
    void deleteByGameId(Long gameId);

    @Query("SELECT COUNT(s) > 0 FROM SubstitutionEntity s WHERE s.playerOut.id = :playerId OR s.playerIn.id = :playerId")
    boolean existsByPlayerId(Long playerId);
}
