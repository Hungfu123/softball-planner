package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LeagueResultEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import org.springframework.stereotype.Component;

@Component
public class SpielbogenMapper {

    private final SeasonMapper seasonMapper;
    private final LeagueResultMapper leagueResultMapper;

    public SpielbogenMapper(final SeasonMapper seasonMapper, final LeagueResultMapper leagueResultMapper) {
        this.seasonMapper = seasonMapper;
        this.leagueResultMapper = leagueResultMapper;
    }

    public Spielbogen toDomain(final SpielbogenEntity e) {
        if (e == null) return null;
        final Spielbogen b = new Spielbogen();
        b.setId(e.getId());
        b.setDate(e.getDate());
        b.setLocation(e.getLocation());
        b.setHomeTeamName(e.getHomeTeamName());
        b.setAwayTeamName(e.getAwayTeamName());
        b.setSeason(e.getSeason() != null ? seasonMapper.toDomain(e.getSeason()) : null);
        b.setStatus(BogenStatus.valueOf(e.getStatus()));
        b.setCurrentInning(e.getCurrentInning());
        b.setCurrentSide(BogenSide.valueOf(e.getCurrentSide()));
        b.setHomeRuns(e.getHomeRuns());
        b.setAwayRuns(e.getAwayRuns());
        b.setLeagueResult(e.getLeagueResult() != null ? leagueResultMapper.toDomain(e.getLeagueResult()) : null);
        b.setCreatedAt(e.getCreatedAt());
        b.setUpdatedAt(e.getUpdatedAt());
        b.setEndedAt(e.getEndedAt());
        b.setPublicToken(e.getPublicToken());
        return b;
    }

    public SpielbogenEntity toEntity(final Spielbogen b) {
        if (b == null) return null;
        final SpielbogenEntity e = new SpielbogenEntity();
        e.setId(b.getId());
        applyToEntity(e, b);
        return e;
    }

    public void updateEntity(final SpielbogenEntity e, final Spielbogen b) {
        applyToEntity(e, b);
    }

    private void applyToEntity(final SpielbogenEntity e, final Spielbogen b) {
        e.setDate(b.getDate());
        e.setLocation(b.getLocation());
        e.setHomeTeamName(b.getHomeTeamName());
        e.setAwayTeamName(b.getAwayTeamName());
        e.setSeason(b.getSeason() != null ? seasonMapper.toEntity(b.getSeason()) : null);
        e.setStatus(b.getStatus().name());
        e.setCurrentInning(b.getCurrentInning());
        e.setCurrentSide(b.getCurrentSide().name());
        e.setHomeRuns(b.getHomeRuns());
        e.setAwayRuns(b.getAwayRuns());
        e.setLeagueResult(toLeagueResultRef(b));
        e.setEndedAt(b.getEndedAt());
        e.setPublicToken(b.getPublicToken());
    }

    /**
     * Creates a stub LeagueResultEntity with only the ID set, used as a JPA FK reference.
     * The full LeagueResult data is owned by its own aggregate and is not duplicated here.
     */
    private LeagueResultEntity toLeagueResultRef(final Spielbogen b) {
        if (b.getLeagueResult() == null || b.getLeagueResult().getId() == null) return null;
        final LeagueResultEntity ref = new LeagueResultEntity();
        ref.setId(b.getLeagueResult().getId());
        return ref;
    }
}
