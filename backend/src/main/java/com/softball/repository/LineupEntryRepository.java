package com.softball.repository;

import com.softball.entity.LineupEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LineupEntryRepository extends JpaRepository<LineupEntry, Long> {
    List<LineupEntry> findByGameIdOrderByBattingOrderAsc(Long gameId);
    void deleteByGameId(Long gameId);
}
