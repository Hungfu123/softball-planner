package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Season;
import org.springframework.stereotype.Component;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class GameDayMapper {

    private final PlayerMapper playerMapper;
    private final GameMapper gameMapper;

    public GameDayMapper(final PlayerMapper playerMapper, final GameMapper gameMapper) {
        this.playerMapper = playerMapper;
        this.gameMapper = gameMapper;
    }

    public GameDay toDomain(final GameDayEntity entity) {
        if (entity == null) return null;
        final GameDay gd = new GameDay(entity.getId(), entity.getDate(), entity.getLabel(), entity.getLocation());
        if (entity.getSeason() != null) {
            final Season season = new Season(entity.getSeason().getId(), entity.getSeason().getName(), entity.getSeason().getYear());
            gd.setSeason(season);
        }
        return gd;
    }

    public GameDay toDomainWithPlayers(final GameDayEntity entity) {
        final GameDay gd = toDomain(entity);
        if (gd != null && entity.getAvailablePlayers() != null) {
            gd.setAvailablePlayers(entity.getAvailablePlayers().stream()
                .map(playerMapper::toDomain)
                .collect(Collectors.toSet()));
        }
        return gd;
    }

    public GameDay toDomainWithGames(final GameDayEntity entity) {
        final GameDay gd = toDomain(entity);
        if (gd != null && entity.getGames() != null) {
            gd.setGames(entity.getGames().stream()
                .map(gameMapper::toDomain)
                .collect(Collectors.toList()));
        }
        return gd;
    }

    public GameDay toDomainWithGamesAndPlayers(final GameDayEntity entity) {
        final GameDay gd = toDomainWithGames(entity);
        if (gd != null && entity.getAvailablePlayers() != null) {
            gd.setAvailablePlayers(entity.getAvailablePlayers().stream()
                .map(playerMapper::toDomain)
                .collect(Collectors.toSet()));
        }
        return gd;
    }

    public GameDayEntity toEntity(final GameDay domain, final SeasonEntity seasonEntity) {
        if (domain == null) return null;
        final GameDayEntity entity = new GameDayEntity(domain.getDate(), domain.getLabel(), domain.getLocation(), seasonEntity);
        entity.setId(domain.getId());
        return entity;
    }

    public void updateEntity(final GameDayEntity entity, final GameDay domain) {
        entity.setDate(domain.getDate());
        entity.setLabel(domain.getLabel());
        entity.setLocation(domain.getLocation());
        syncGames(entity, domain);
    }

    private void syncGames(final GameDayEntity entity, final GameDay domain) {
        if (domain.getGames() == null) return;

        // GameNumbers im Domain — Quelle der Wahrheit nach update()
        final Set<Integer> domainGameNumbers = domain.getGames().stream()
            .map(g -> g.getGameNumber())
            .collect(Collectors.toSet());

        // Entity-Games entfernen die nicht mehr im Domain sind (orphanRemoval triggert DB-Delete)
        entity.getGames().removeIf(ge -> !domainGameNumbers.contains(ge.getGameNumber()));

        // Neue Games hinzufügen (Domain hat sie, Entity noch nicht)
        final Set<Integer> entityGameNumbers = entity.getGames().stream()
            .map(GameEntity::getGameNumber)
            .collect(Collectors.toCollection(HashSet::new));
        for (final var domainGame : domain.getGames()) {
            if (!entityGameNumbers.contains(domainGame.getGameNumber())) {
                final GameEntity newGame = new GameEntity(domainGame.getGameNumber(), entity);
                entity.getGames().add(newGame);
            }
        }
    }
}
