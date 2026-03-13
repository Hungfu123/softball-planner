package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.SeasonMapper;
import com.softball.adapter.out.persistence.mapper.GameDayMapper;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.Season;
import com.softball.domain.port.out.SeasonRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class SeasonRepositoryAdapter implements SeasonRepository {

    private final SpringSeasonRepository repo;
    private final SeasonMapper mapper;
    private final GameDayMapper gameDayMapper;

    public SeasonRepositoryAdapter(final SpringSeasonRepository repo, final SeasonMapper mapper, final GameDayMapper gameDayMapper) {
        this.repo = repo;
        this.mapper = mapper;
        this.gameDayMapper = gameDayMapper;
    }

    @Override
    public List<Season> findAll() {
        return repo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Season> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Season save(final Season season) {
        var entity = mapper.toEntity(season);
        if (season.getId() != null) {
            var existing = repo.findById(season.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, season);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public Optional<Season> findByIdWithGameDaysAndGames(final Long id) {
        return repo.findByIdWithGameDaysAndGames(id).map(entity -> {
            final Season season = mapper.toDomain(entity);
            if (entity.getGameDays() != null) {
                season.setGameDays(entity.getGameDays().stream()
                    .map(gameDayMapper::toDomainWithGames)
                    .collect(Collectors.toSet()));
            }
            return season;
        });
    }
}
