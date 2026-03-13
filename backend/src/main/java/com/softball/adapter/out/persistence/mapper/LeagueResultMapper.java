package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LeagueResultEntity;
import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.domain.model.LeagueResult;
import org.springframework.stereotype.Component;

@Component
public class LeagueResultMapper {

    private final LeagueTeamMapper leagueTeamMapper;

    public LeagueResultMapper(final LeagueTeamMapper leagueTeamMapper) {
        this.leagueTeamMapper = leagueTeamMapper;
    }

    public LeagueResult toDomain(final LeagueResultEntity entity) {
        if (entity == null) return null;
        final LeagueResult lr = new LeagueResult(
            entity.getId(),
            leagueTeamMapper.toDomain(entity.getHomeTeam()),
            leagueTeamMapper.toDomain(entity.getAwayTeam()),
            entity.getHomeScore(),
            entity.getAwayScore(),
            entity.getDate()
        );
        if (entity.getSeason() != null) {
            final com.softball.domain.model.Season season = new com.softball.domain.model.Season();
            season.setId(entity.getSeason().getId());
            lr.setSeason(season);
        }
        return lr;
    }

    public LeagueResultEntity toEntity(final LeagueResult domain, final SeasonEntity seasonEntity,
                                        final LeagueTeamEntity homeEntity, final LeagueTeamEntity awayEntity) {
        final LeagueResultEntity entity = new LeagueResultEntity(seasonEntity, homeEntity, awayEntity,
            domain.getHomeScore(), domain.getAwayScore(), domain.getDate());
        entity.setId(domain.getId());
        return entity;
    }
}
