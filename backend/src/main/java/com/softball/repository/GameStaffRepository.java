package com.softball.repository;

import com.softball.entity.GameStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GameStaffRepository extends JpaRepository<GameStaff, Long> {
    List<GameStaff> findByGameId(Long gameId);
    List<GameStaff> findByGameIdIn(List<Long> gameIds);
    void deleteByGameId(Long gameId);
}
