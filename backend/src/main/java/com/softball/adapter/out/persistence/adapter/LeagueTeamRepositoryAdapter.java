package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.mapper.LeagueTeamMapper;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.port.out.LeagueTeamRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class LeagueTeamRepositoryAdapter implements LeagueTeamRepository {

    private final SpringLeagueTeamRepository repo;
    private final SpringSeasonRepository seasonRepo;
    private final LeagueTeamMapper mapper;

    public LeagueTeamRepositoryAdapter(final SpringLeagueTeamRepository repo,
                                        final SpringSeasonRepository seasonRepo,
                                        final LeagueTeamMapper mapper) {
        this.repo = repo;
        this.seasonRepo = seasonRepo;
        this.mapper = mapper;
    }

    @Override
    public List<LeagueTeam> findBySeasonIdOrderByNameAsc(final Long seasonId) {
        return repo.findBySeason_IdOrderByNameAsc(seasonId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<LeagueTeam> findAll() {
        return repo.findAll().stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<LeagueTeam> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<LeagueTeam> findBySeasonIdAndNameIgnoreCase(final Long seasonId, final String name) {
        return repo.findBySeason_IdAndNameIgnoreCase(seasonId, name).map(mapper::toDomain);
    }

    @Override
    public LeagueTeam save(final LeagueTeam team) {
        if (team.getId() != null) {
            var existing = repo.findById(team.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, team);
                return mapper.toDomain(repo.save(existing));
            }
        }
        final SeasonEntity seasonEntity = seasonRepo.getReferenceById(team.getSeason().getId());
        var entity = mapper.toEntity(team, seasonEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
