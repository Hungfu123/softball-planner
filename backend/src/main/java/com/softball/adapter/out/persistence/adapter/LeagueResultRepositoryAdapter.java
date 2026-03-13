package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.mapper.LeagueResultMapper;
import com.softball.adapter.out.persistence.repository.SpringLeagueResultRepository;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.LeagueResult;
import com.softball.domain.port.out.LeagueResultRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class LeagueResultRepositoryAdapter implements LeagueResultRepository {

    private final SpringLeagueResultRepository repo;
    private final SpringSeasonRepository seasonRepo;
    private final SpringLeagueTeamRepository teamRepo;
    private final LeagueResultMapper mapper;

    public LeagueResultRepositoryAdapter(final SpringLeagueResultRepository repo,
                                          final SpringSeasonRepository seasonRepo,
                                          final SpringLeagueTeamRepository teamRepo,
                                          final LeagueResultMapper mapper) {
        this.repo = repo;
        this.seasonRepo = seasonRepo;
        this.teamRepo = teamRepo;
        this.mapper = mapper;
    }

    @Override
    public List<LeagueResult> findBySeasonIdOrderByDateAsc(final Long seasonId) {
        return repo.findBySeason_IdOrderByDateAsc(seasonId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<LeagueResult> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public LeagueResult save(final LeagueResult result) {
        final SeasonEntity seasonEntity = seasonRepo.getReferenceById(result.getSeason().getId());
        final LeagueTeamEntity homeEntity = teamRepo.getReferenceById(result.getHomeTeam().getId());
        final LeagueTeamEntity awayEntity = teamRepo.getReferenceById(result.getAwayTeam().getId());
        if (result.getId() != null) {
            var existing = repo.findById(result.getId()).orElse(null);
            if (existing != null) {
                existing.setHomeTeam(homeEntity);
                existing.setAwayTeam(awayEntity);
                existing.setHomeScore(result.getHomeScore());
                existing.setAwayScore(result.getAwayScore());
                existing.setDate(result.getDate());
                return mapper.toDomain(repo.save(existing));
            }
        }
        var entity = mapper.toEntity(result, seasonEntity, homeEntity, awayEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public List<LeagueResult> findByHomeTeamIdOrAwayTeamId(final Long homeTeamId, final Long awayTeamId) {
        return repo.findByHomeTeam_IdOrAwayTeam_Id(homeTeamId, awayTeamId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public void deleteAll(final List<LeagueResult> results) {
        var ids = results.stream().map(LeagueResult::getId).filter(id -> id != null).toList();
        if (!ids.isEmpty()) {
            repo.deleteAllById(ids);
        }
    }
}
