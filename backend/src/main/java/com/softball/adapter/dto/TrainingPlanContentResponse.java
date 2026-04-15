package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPlanContent;

import java.util.List;

public record TrainingPlanContentResponse(
        List<TrainingPlanSectionResponse> sections,
        String groupDistributionHint,
        String overallNotes) {

    public static TrainingPlanContentResponse from(final TrainingPlanContent content) {
        if (content == null) {
            return null;
        }
        final List<TrainingPlanSectionResponse> sections = content.getSections() != null
                ? content.getSections().stream().map(TrainingPlanSectionResponse::from).toList()
                : List.of();
        return new TrainingPlanContentResponse(sections, content.getGroupDistributionHint(), content.getOverallNotes());
    }

    public TrainingPlanContent toDomain() {
        final List<com.softball.domain.model.TrainingPlanSection> domainSections = sections != null
                ? sections.stream().map(TrainingPlanSectionResponse::toDomain).toList()
                : List.of();
        return new TrainingPlanContent(domainSections, groupDistributionHint, overallNotes);
    }
}
