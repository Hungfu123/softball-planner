package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.mapper.GameDayMapper;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.GameDay;
import com.softball.domain.port.out.GameDayRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class GameDayRepositoryAdapter implements GameDayRepository {

    private final SpringGameDayRepository repo;
    private final SpringSeasonRepository seasonRepo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final GameDayMapper mapper;

    public GameDayRepositoryAdapter(final SpringGameDayRepository repo, final SpringSeasonRepository seasonRepo,
                                    final SpringGameRepository gameRepo, final SpringPlayerRepository playerRepo,
                                    final GameDayMapper mapper) {
        this.repo = repo;
        this.seasonRepo = seasonRepo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<GameDay> findBySeasonIdOrderByDateAsc(final Long seasonId) {
        return repo.findBySeasonIdOrderByDateAsc(seasonId).stream()
            .map(mapper::toDomainWithGames).toList();
    }

    @Override
    public Optional<GameDay> findById(final Long id) {
        return loadFullOptional(id);
    }

    @Override
    public Optional<GameDay> findByIdWithPlayers(final Long id) {
        return repo.findByIdWithPlayers(id).map(mapper::toDomainWithPlayers);
    }

    @Override
    public Optional<GameDay> findByIdWithGames(final Long id) {
        return repo.findByIdWithGames(id).map(mapper::toDomainWithGames);
    }

    @Override
    public Optional<GameDay> findByIdWithGamesAndPlayers(final Long id) {
        // Zwei Collections in EINEM JOIN FETCH = kartesisches Produkt -> games (List/Bag)
        // wird je Spieler dupliziert (N Spieler -> N× "Spiel 1"-Tabs). Stattdessen beide
        // Collections in separaten Queries laden: im selben Persistence-Context liefert
        // die zweite Query dieselbe managed Entity und initialisiert nur die andere
        // Collection — kein Cross-Join, keine Duplikate.
        final Optional<GameDayEntity> withGames = repo.findByIdWithGames(id);
        if (withGames.isEmpty()) {
            return Optional.empty();
        }
        repo.findByIdWithPlayers(id); // initialisiert availablePlayers auf derselben Entity
        return withGames.map(mapper::toDomainWithGamesAndPlayers);
    }

    @Override
    public GameDay save(final GameDay gameDay) {
        GameDayEntity savedEntity;

        if (gameDay.getId() != null) {
            savedEntity = repo.findById(gameDay.getId()).orElse(null);
            if (savedEntity != null) {
                mapper.updateEntity(savedEntity, gameDay);
                syncAvailablePlayers(savedEntity, gameDay);
                savedEntity = repo.save(savedEntity);
                return loadFull(savedEntity.getId());
            }
        }

        final SeasonEntity seasonEntity = seasonRepo.findById(gameDay.getSeason().getId())
            .orElseThrow();
        var entity = mapper.toEntity(gameDay, seasonEntity);

        // Add games to entity for JPA cascade
        if (gameDay.getGames() != null && !gameDay.getGames().isEmpty()) {
            for (var game : gameDay.getGames()) {
                GameEntity gameEntity = new GameEntity(game.getGameNumber(), entity);
                entity.getGames().add(gameEntity);
            }
        }

        // Handle available players
        syncAvailablePlayers(entity, gameDay);

        savedEntity = repo.save(entity);
        repo.flush();

        return loadFull(savedEntity.getId());
    }

    private GameDay loadFull(final Long id) {
        return loadFullOptional(id).orElseThrow();
    }

    /**
     * Loads GameDay with both games and players using two separate queries
     * to avoid Cartesian product from dual LEFT JOIN FETCH.
     */
    private Optional<GameDay> loadFullOptional(final Long id) {
        // First query: initialize games collection in persistence context
        final Optional<GameDayEntity> withGames = repo.findByIdWithGames(id);
        if (withGames.isEmpty()) return Optional.empty();
        // Second query: initialize players on the same managed entity
        repo.findByIdWithPlayers(id);
        return withGames.map(mapper::toDomainWithGamesAndPlayers);
    }

    private void syncAvailablePlayers(final GameDayEntity entity, final GameDay gameDay) {
        if (gameDay.getAvailablePlayers() != null) {
            Set<PlayerEntity> playerEntities = gameDay.getAvailablePlayers().stream()
                .map(p -> playerRepo.getReferenceById(p.getId()))
                .collect(Collectors.toSet());
            entity.setAvailablePlayers(playerEntities);
        }
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsBySeasonAndDate(final Long seasonId, final LocalDate date) {
        return repo.existsBySeasonAndDate(seasonId, date);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }
}
