package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LineupEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface SpringLineupEntryRepository extends JpaRepository<LineupEntryEntity, Long> {

    @Query("SELECT le FROM LineupEntryEntity le JOIN FETCH le.player LEFT JOIN FETCH le.dhBatterPlayer WHERE le.game.id = :gameId ORDER BY le.battingOrder ASC")
    List<LineupEntryEntity> findByGameIdOrderByBattingOrderAsc(Long gameId);

    @Query("SELECT le FROM LineupEntryEntity le JOIN FETCH le.player LEFT JOIN FETCH le.dhBatterPlayer JOIN FETCH le.game WHERE le.game.id IN :gameIds ORDER BY le.battingOrder ASC")
    List<LineupEntryEntity> findByGameIdInOrderByBattingOrderAsc(List<Long> gameIds);

    @Query("""
        SELECT DISTINCT le.game.gameDay.id FROM LineupEntryEntity le
        WHERE le.player.id = :playerId OR le.dhBatterPlayer.id = :playerId
        """)
    List<Long> findGameDayIdsByPlayerId(Long playerId);

    /*
     * Die drei Schlagplatz-Abfragen zaehlen nur VERGANGENE Spieltage (< heute). Zweierlei haengt
     * daran: das Einsatz-Profil sagt zu, nur Gewesenes zu zaehlen — und ohne die Grenze verriete
     * das Histogramm den Schlagplatz im noch nicht gespielten, nicht freigegebenen Spiel. Die
     * Grenze ist fuer alle Rollen dieselbe, die Antwort bleibt also cachebar.
     *
     * **Welcher Tag „heute" ist, sagt der Aufrufer, nicht die Datenbank.** Hier stand
     * CURRENT_DATE, und das ist der Tag des Datenbank-Servers in dessen Zone — UTC. Zwischen
     * 23 Uhr UTC und Mitternacht ist in Berlin laengst der naechste Tag: der Spieltag von
     * gestern fiel in dieser Stunde aus dem Histogramm. Die Anwendung rechnet in
     * Europe/Berlin (siehe PlayerProfileService) und reicht das Datum herein.
     */
    @Query("""
        SELECT le.battingOrder FROM LineupEntryEntity le
        WHERE (le.player.id = :playerId OR le.dhBatterPlayer.id = :playerId)
          AND le.battingOrder IS NOT NULL
          AND le.game.gameDay.date < :heute
        """)
    List<Integer> findBattingOrdersByPlayerId(Long playerId, LocalDate heute);

    @Query("""
        SELECT le.battingOrder FROM LineupEntryEntity le
        WHERE (le.player.id = :playerId OR le.dhBatterPlayer.id = :playerId)
          AND le.battingOrder IS NOT NULL
          AND le.game.gameDay.date < :heute
          AND EXTRACT(YEAR FROM le.game.gameDay.date) = :year
        """)
    List<Integer> findBattingOrdersByPlayerIdAndYear(Long playerId, int year, LocalDate heute);

    @Query("""
        SELECT le.battingOrder FROM LineupEntryEntity le
        WHERE (le.player.id = :playerId OR le.dhBatterPlayer.id = :playerId)
          AND le.battingOrder IS NOT NULL
          AND le.game.gameDay.date < :heute
          AND le.game.gameDay.season.id = :seasonId
        """)
    List<Integer> findBattingOrdersByPlayerIdAndSeason(Long playerId, long seasonId, LocalDate heute);

    @Modifying
    @Query("DELETE FROM LineupEntryEntity le WHERE le.game.id = :gameId")
    void deleteByGameId(Long gameId);
}
