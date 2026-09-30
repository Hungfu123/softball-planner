package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.mapper.TrainingAttendanceMapper;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingAttendanceRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class TrainingAttendanceRepositoryAdapter implements TrainingAttendanceRepository {

    private final SpringTrainingAttendanceRepository repo;
    private final SpringTrainingRepository trainingRepo;
    private final SpringPlayerRepository playerRepo;
    private final TrainingAttendanceMapper mapper;

    public TrainingAttendanceRepositoryAdapter(final SpringTrainingAttendanceRepository repo,
                                                final SpringTrainingRepository trainingRepo,
                                                final SpringPlayerRepository playerRepo,
                                                final TrainingAttendanceMapper mapper) {
        this.repo = repo;
        this.trainingRepo = trainingRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<TrainingAttendance> findByTrainingId(final Long trainingId) {
        return repo.findByTrainingId(trainingId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<TrainingAttendance> findByTrainingIdIn(final List<Long> trainingIds) {
        return repo.findByTrainingIdIn(trainingIds).stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional
    public void deleteByTrainingId(final Long trainingId) {
        repo.deleteByTrainingId(trainingId);
    }

    @Override
    @Transactional
    public void deleteByTrainingIds(final List<Long> trainingIds) {
        repo.deleteByTrainingIdIn(trainingIds);
    }

    @Override
    @Transactional
    public void deleteByPlayerId(final Long playerId) {
        repo.deleteByPlayerId(playerId);
    }

    @Override
    public List<TrainingAttendance> saveAll(final List<TrainingAttendance> attendances) {
        var entities = attendances.stream().map(a -> {
            TrainingEntity trainingEntity = trainingRepo.getReferenceById(a.getTraining().getId());
            PlayerEntity playerEntity = playerRepo.getReferenceById(a.getPlayer().getId());
            return mapper.toEntity(a, trainingEntity, playerEntity);
        }).toList();
        return repo.saveAll(entities).stream().map(mapper::toDomain).toList();
    }
}
