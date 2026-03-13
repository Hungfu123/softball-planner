package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import org.springframework.stereotype.Component;

@Component
public class LeagueTeamMapper {

    public LeagueTeam toDomain(final LeagueTeamEntity entity) {
        if (entity == null) return null;
        final LeagueTeam lt = new LeagueTeam(entity.getId(), entity.getName(), entity.isOwnTeam());
        if (entity.getSeason() != null) {
            final Season season = new Season();
            season.setId(entity.getSeason().getId());
            lt.setSeason(season);
        }
        return lt;
    }

    public LeagueTeamEntity toEntity(final LeagueTeam domain, final SeasonEntity seasonEntity) {
        final LeagueTeamEntity entity = new LeagueTeamEntity(seasonEntity, domain.getName(), domain.isOwnTeam());
        entity.setId(domain.getId());
        return entity;
    }

    public void updateEntity(final LeagueTeamEntity entity, final LeagueTeam domain) {
        entity.setName(domain.getName());
    }
}
