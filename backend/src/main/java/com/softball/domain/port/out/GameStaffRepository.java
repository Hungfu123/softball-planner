package com.softball.domain.port.out;

import com.softball.domain.model.GameStaff;
import java.util.List;

public interface GameStaffRepository {
    List<GameStaff> findByGameId(Long gameId);
    List<GameStaff> findByGameIdIn(List<Long> gameIds);
    void deleteByGameId(Long gameId);
    GameStaff save(GameStaff staff);
    List<GameStaff> saveAll(List<GameStaff> staff);
    void flush();
    void deleteAll(List<GameStaff> staff);
}
