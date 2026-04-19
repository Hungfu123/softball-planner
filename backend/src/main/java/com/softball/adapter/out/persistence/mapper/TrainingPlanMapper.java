package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.TrainingPlanEntity;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import org.springframework.stereotype.Component;

@Component
public class TrainingPlanMapper {

    private final ObjectMapper objectMapper;

    public TrainingPlanMapper(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public TrainingPlan toDomain(final TrainingPlanEntity entity) {
        if (entity == null) {
            return null;
        }
        final TrainingPlan plan = new TrainingPlan();
        plan.setId(entity.getId());
        plan.setTrainingId(entity.getTrainingId());
        plan.setPlayerCount(entity.getPlayerCount());
        plan.setFocus(entity.getFocus());
        plan.setDurationMinutes(entity.getDurationMinutes());
        plan.setContent(deserializeContent(entity.getPlanContent()));
        plan.setCreatedAt(entity.getCreatedAt());
        plan.setUpdatedAt(entity.getUpdatedAt());
        return plan;
    }

    public TrainingPlanEntity toEntity(final TrainingPlan domain) {
        if (domain == null) {
            return null;
        }
        final TrainingPlanEntity entity = new TrainingPlanEntity();
        entity.setId(domain.getId());
        entity.setTrainingId(domain.getTrainingId());
        entity.setPlayerCount(domain.getPlayerCount());
        entity.setFocus(domain.getFocus());
        entity.setDurationMinutes(domain.getDurationMinutes());
        entity.setPlanContent(serializeContent(domain.getContent()));
        return entity;
    }

    public void updateEntity(final TrainingPlanEntity entity, final TrainingPlan domain) {
        entity.setPlayerCount(domain.getPlayerCount());
        entity.setFocus(domain.getFocus());
        entity.setDurationMinutes(domain.getDurationMinutes());
        entity.setPlanContent(serializeContent(domain.getContent()));
    }

    private TrainingPlanContent deserializeContent(final String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, TrainingPlanContent.class);
        } catch (final JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize training plan content", e);
        }
    }

    private String serializeContent(final TrainingPlanContent content) {
        if (content == null) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(content);
        } catch (final JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize training plan content", e);
        }
    }
}
