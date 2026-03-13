package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.adapter.out.persistence.mapper.TrainingMapper;
import com.softball.adapter.out.persistence.repository.SpringTrainingPeriodRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.Training;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class TrainingRepositoryAdapter implements TrainingRepository {

    private final SpringTrainingRepository repo;
    private final SpringTrainingPeriodRepository periodRepo;
    private final TrainingMapper mapper;

    public TrainingRepositoryAdapter(final SpringTrainingRepository repo,
                                      final SpringTrainingPeriodRepository periodRepo,
                                      final TrainingMapper mapper) {
        this.repo = repo;
        this.periodRepo = periodRepo;
        this.mapper = mapper;
    }

    @Override
    public List<Training> findAllByOrderByDateDesc() {
        return repo.findAllByOrderByDateDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Training> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Training save(final Training training) {
        TrainingPeriodEntity periodEntity = training.getPeriod() != null && training.getPeriod().getId() != null
            ? periodRepo.getReferenceById(training.getPeriod().getId())
            : null;
        if (training.getId() != null) {
            var existing = repo.findById(training.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, training);
                existing.setPeriod(periodEntity);
                return mapper.toDomain(repo.save(existing));
            }
        }
        var entity = mapper.toEntity(training, periodEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public List<Training> saveAll(final List<Training> trainings) {
        return trainings.stream().map(this::save).toList();
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public long countByCancelledFalse() {
        return repo.countByCancelledFalse();
    }

    @Override
    public List<Training> findByDateIn(final Set<LocalDate> dates) {
        return repo.findByDateIn(dates).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Training> findByPeriodIdOrderByDateDesc(final Long periodId) {
        return repo.findByPeriodIdOrderByDateDesc(periodId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public boolean existsByDate(final LocalDate date) {
        return repo.existsByDate(date);
    }

    @Override
    public Optional<Training> findByDate(final LocalDate date) {
        return repo.findByDate(date).map(mapper::toDomain);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public void flush() {
        repo.flush();
    }

    @Override
    public void deleteAll(final List<Training> trainings) {
        var ids = trainings.stream().map(Training::getId).filter(id -> id != null).toList();
        if (!ids.isEmpty()) {
            repo.deleteAllById(ids);
        }
    }
}
