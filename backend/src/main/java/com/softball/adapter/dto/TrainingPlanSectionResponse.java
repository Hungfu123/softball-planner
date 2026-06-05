package com.softball.adapter.dto;

import com.softball.domain.model.SectionGroup;
import com.softball.domain.model.StationLevel;
import com.softball.domain.model.StationType;
import com.softball.domain.model.TrainingPlanSection;

public record TrainingPlanSectionResponse(
        String drillId, String sectionType, String title, Integer durationMinutes,
        Integer rounds, String adaptationNotes, String rotationPlan, String setupNotes,
        String tips, String groupSetup, String userNotes,
        Integer parallelGroup, Integer playersPerGroup,
        SectionGroup group, StationType stationType, StationLevel stationLevel, Integer stationChoiceGroup) {

    public static TrainingPlanSectionResponse from(final TrainingPlanSection section) {
        return new TrainingPlanSectionResponse(
                section.getDrillId(), section.getSectionType(), section.getTitle(),
                section.getDurationMinutes(), section.getRounds(), section.getAdaptationNotes(),
                section.getRotationPlan(), section.getSetupNotes(), section.getTips(),
                section.getGroupSetup(), section.getUserNotes(),
                section.getParallelGroup(), section.getPlayersPerGroup(),
                section.getGroup(), section.getStationType(), section.getStationLevel(), section.getStationChoiceGroup()
        );
    }

    public TrainingPlanSection toDomain() {
        final TrainingPlanSection section = new TrainingPlanSection();
        section.setDrillId(drillId);
        section.setSectionType(sectionType);
        section.setTitle(title);
        section.setDurationMinutes(durationMinutes);
        section.setRounds(rounds);
        section.setAdaptationNotes(adaptationNotes);
        section.setRotationPlan(rotationPlan);
        section.setSetupNotes(setupNotes);
        section.setTips(tips);
        section.setGroupSetup(groupSetup);
        section.setUserNotes(userNotes);
        section.setParallelGroup(parallelGroup);
        section.setPlayersPerGroup(playersPerGroup);
        section.setGroup(group != null ? group : SectionGroup.ALL);
        section.setStationType(stationType);
        section.setStationLevel(stationLevel);
        section.setStationChoiceGroup(stationChoiceGroup);
        return section;
    }
}
