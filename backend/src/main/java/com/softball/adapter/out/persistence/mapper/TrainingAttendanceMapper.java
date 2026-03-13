package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.TrainingAttendanceEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.domain.model.TrainingAttendance;
import org.springframework.stereotype.Component;

@Component
public class TrainingAttendanceMapper {

    private final PlayerMapper playerMapper;
    private final TrainingMapper trainingMapper;

    public TrainingAttendanceMapper(final PlayerMapper playerMapper, final TrainingMapper trainingMapper) {
        this.playerMapper = playerMapper;
        this.trainingMapper = trainingMapper;
    }

    public TrainingAttendance toDomain(final TrainingAttendanceEntity entity) {
        if (entity == null) return null;
        final TrainingAttendance ta = new TrainingAttendance(
            trainingMapper.toDomain(entity.getTraining()),
            playerMapper.toDomain(entity.getPlayer()),
            entity.isPresent());
        ta.setId(entity.getId());
        return ta;
    }

    public TrainingAttendanceEntity toEntity(final TrainingAttendance domain, final TrainingEntity trainingEntity, final PlayerEntity playerEntity) {
        final TrainingAttendanceEntity entity = new TrainingAttendanceEntity(trainingEntity, playerEntity, domain.isPresent());
        entity.setId(domain.getId());
        return entity;
    }
}
