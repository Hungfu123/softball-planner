package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.TrainingPeriodMapper;
import com.softball.adapter.out.persistence.repository.SpringTrainingPeriodRepository;
import com.softball.domain.model.TrainingPeriod;
import com.softball.domain.port.out.TrainingPeriodRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class TrainingPeriodRepositoryAdapter implements TrainingPeriodRepository {

    private final SpringTrainingPeriodRepository repo;
    private final TrainingPeriodMapper mapper;

    public TrainingPeriodRepositoryAdapter(final SpringTrainingPeriodRepository repo, final TrainingPeriodMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<TrainingPeriod> findAllByOrderByStartDateDesc() {
        return repo.findAllByOrderByStartDateDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<TrainingPeriod> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<TrainingPeriod> findByNameIgnoreCase(final String name) {
        return repo.findByNameIgnoreCase(name).map(mapper::toDomain);
    }

    @Override
    public TrainingPeriod save(final TrainingPeriod period) {
        if (period.getId() != null) {
            var existing = repo.findById(period.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, period);
                return mapper.toDomain(repo.save(existing));
            }
        }
        var entity = mapper.toEntity(period);
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
}
