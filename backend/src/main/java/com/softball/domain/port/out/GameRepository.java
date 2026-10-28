package com.softball.domain.port.out;

import com.softball.domain.model.Game;
import java.util.List;
import java.util.Optional;

public interface GameRepository {
    Optional<Game> findById(Long id);
    /**
     * Nur die Spieltag-id zu einem Spiel. Fuer Aufrufer ausserhalb einer Transaktion: das
     * ganze Spiel zu laden, zieht den Spieltag als Lazy-Proxy nach sich.
     */
    Optional<Long> findGameDayIdByGameId(Long gameId);
    Game save(Game game);
    List<Game> saveAll(List<Game> games);
    List<Game> findByGameDayIdOrderByGameNumberAsc(Long gameDayId);
    List<Game> findByOpponentTeamId(Long teamId);
    List<Game> findAllWithOpponent();
    /** Spiele mit Spieltag, Saison und (optionalem) Gegner — für Auswertungen, die nur IDs in der Hand haben. */
    List<Game> findAllByIdWithDetails(List<Long> gameIds);
    List<Game> findBySeasonIdWithScores(Long seasonId);
    void flush();
}
