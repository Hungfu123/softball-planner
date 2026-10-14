package com.softball.domain.port.out;

import com.softball.domain.model.LineupEntry;
import java.util.List;

public interface LineupEntryRepository {
    List<LineupEntry> findByGameIdOrderByBattingOrderAsc(Long gameId);
    List<LineupEntry> findByGameIdInOrderByBattingOrderAsc(List<Long> gameIds);
    /** Spieltage, an denen der Spieler aufgestellt war — als Feldspieler oder als DH-Batter. */
    List<Long> findGameDayIdsByPlayerId(Long playerId);
    /** Alle Schlagplaetze, die der Spieler je hatte; als DH-Batter der Platz seines Gastgebers. */
    List<Integer> findBattingOrdersByPlayerId(Long playerId);
    /** Dieselbe Liste, auf ein Kalenderjahr beschraenkt. */
    List<Integer> findBattingOrdersByPlayerIdAndYear(Long playerId, int year);
    /** Dieselbe Liste, auf eine Saison beschraenkt. */
    List<Integer> findBattingOrdersByPlayerIdAndSeason(Long playerId, long seasonId);
    void deleteByGameId(Long gameId);
    LineupEntry save(LineupEntry entry);
    List<LineupEntry> saveAll(List<LineupEntry> entries);
    void flush();
    void deleteAll(List<LineupEntry> entries);
}
