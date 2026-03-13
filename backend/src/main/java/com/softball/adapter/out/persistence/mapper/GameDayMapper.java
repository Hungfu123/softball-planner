package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Season;
import org.springframework.stereotype.Component;
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
    }
}
