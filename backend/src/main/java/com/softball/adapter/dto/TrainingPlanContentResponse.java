package com.softball.adapter.dto;

import com.softball.domain.model.TrainingPlanContent;

import java.util.List;

public record TrainingPlanContentResponse(
        List<TrainingPlanSectionResponse> sections,
        String groupDistributionHint,
        String overallNotes,
        List<TrainingStationDto> stations) {

    public static TrainingPlanContentResponse from(final TrainingPlanContent content) {
        if (content == null) {
            return null;
        }
        final List<TrainingPlanSectionResponse> sections = content.getSections() != null
                ? content.getSections().stream().map(TrainingPlanSectionResponse::from).toList()
                : List.of();
        final List<TrainingStationDto> stations = content.getStations() != null
                ? content.getStations().stream().map(TrainingStationDto::from).toList()
                : null;
        return new TrainingPlanContentResponse(sections, content.getGroupDistributionHint(), content.getOverallNotes(), stations);
    }

    public TrainingPlanContent toDomain() {
        final List<com.softball.domain.model.TrainingPlanSection> domainSections = sections != null
                ? sections.stream().map(TrainingPlanSectionResponse::toDomain).toList()
                : List.of();
        final TrainingPlanContent content = new TrainingPlanContent(domainSections, groupDistributionHint, overallNotes);
        if (stations != null) {
            content.setStations(stations.stream().map(TrainingStationDto::toDomain).toList());
        }
        return content;
    }
}
