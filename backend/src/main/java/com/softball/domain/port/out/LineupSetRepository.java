package com.softball.domain.port.out;

import com.softball.domain.model.LineupSet;
import java.util.List;
import java.util.Optional;

public interface LineupSetRepository {
    List<LineupSet> findByGameDayId(Long gameDayId);
    Optional<LineupSet> findById(Long id);
    LineupSet save(LineupSet lineupSet);
    void deleteById(Long id);
    int maxSortOrder(Long gameDayId);
}
