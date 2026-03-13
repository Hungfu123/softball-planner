package com.softball.domain.port.out;

import com.softball.domain.model.LineupEntry;
import java.util.List;

public interface LineupEntryRepository {
    List<LineupEntry> findByGameIdOrderByBattingOrderAsc(Long gameId);
    List<LineupEntry> findByGameIdInOrderByBattingOrderAsc(List<Long> gameIds);
    void deleteByGameId(Long gameId);
    LineupEntry save(LineupEntry entry);
    List<LineupEntry> saveAll(List<LineupEntry> entries);
    void flush();
    void deleteAll(List<LineupEntry> entries);
}
