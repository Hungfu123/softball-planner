package com.softball.domain.port.out;

import com.softball.domain.model.LineupEntry;
import java.time.LocalDate;
import java.util.List;

public interface LineupEntryRepository {
    List<LineupEntry> findByGameIdOrderByBattingOrderAsc(Long gameId);
    List<LineupEntry> findByGameIdInOrderByBattingOrderAsc(List<Long> gameIds);
    /** Spieltage, an denen der Spieler aufgestellt war — als Feldspieler oder als DH-Batter. */
    List<Long> findGameDayIdsByPlayerId(Long playerId);
    /**
     * Die Schlagplaetze des Spielers vor {@code heute}; als DH-Batter der Platz seines
     * Gastgebers. Welcher Tag heute ist, sagt der Aufrufer — die Zone des Datenbank-Servers
     * ist nicht die des Teams.
     */
    List<Integer> findBattingOrdersByPlayerId(Long playerId, LocalDate heute);
    /** Dieselbe Liste, auf ein Kalenderjahr beschraenkt. */
    List<Integer> findBattingOrdersByPlayerIdAndYear(Long playerId, int year, LocalDate heute);
    /** Dieselbe Liste, auf eine Saison beschraenkt. */
    List<Integer> findBattingOrdersByPlayerIdAndSeason(Long playerId, long seasonId, LocalDate heute);
    void deleteByGameId(Long gameId);
    LineupEntry save(LineupEntry entry);
    List<LineupEntry> saveAll(List<LineupEntry> entries);
    void flush();
    void deleteAll(List<LineupEntry> entries);
}
