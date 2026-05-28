package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.TrainingPlanMapper;
import com.softball.adapter.out.persistence.repository.SpringTrainingPlanRepository;
import com.softball.domain.model.PlanKind;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.port.out.TrainingPlanRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class TrainingPlanRepositoryAdapter implements TrainingPlanRepository {

    private final SpringTrainingPlanRepository repo;
    private final TrainingPlanMapper mapper;

    public TrainingPlanRepositoryAdapter(final SpringTrainingPlanRepository repo,
                                         final TrainingPlanMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public TrainingPlan save(final TrainingPlan plan) {
        if (plan.getId() != null) {
            final var existing = repo.findById(plan.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, plan);
                return mapper.toDomain(repo.save(existing));
            }
        }
        final var entity = mapper.toEntity(plan);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public Optional<TrainingPlan> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<TrainingPlan> findAllByTrainingId(final Long trainingId) {
        return repo.findAllByTrainingId(trainingId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<TrainingPlan> findByTrainingIdAndKind(final Long trainingId, final PlanKind kind) {
        return repo.findByTrainingIdAndKind(trainingId, kind).map(mapper::toDomain);
    }

    @Override
    public List<TrainingPlan> findByTrainingIdIn(final List<Long> trainingIds) {
        if (trainingIds == null || trainingIds.isEmpty()) return List.of();
        return repo.findByTrainingIdIn(trainingIds).stream().map(mapper::toDomain).toList();
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteByTrainingIds(final List<Long> trainingIds) {
        if (trainingIds != null && !trainingIds.isEmpty()) {
            repo.deleteByTrainingIdIn(trainingIds);
        }
    }
}
