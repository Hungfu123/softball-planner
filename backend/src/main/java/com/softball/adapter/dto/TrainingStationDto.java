package com.softball.adapter.dto;

import com.softball.domain.model.StationLevel;
import com.softball.domain.model.StationType;
import com.softball.domain.model.TrainingStation;

public record TrainingStationDto(
        StationType type, String label, StationLevel level, Integer choiceGroup, Double x, Double y) {

    public static TrainingStationDto from(final TrainingStation station) {
        return new TrainingStationDto(
                station.getType(), station.getLabel(), station.getLevel(), station.getChoiceGroup(),
                station.getX(), station.getY());
    }

    public TrainingStation toDomain() {
        final TrainingStation station = new TrainingStation();
        station.setType(type);
        station.setLabel(label);
        station.setLevel(level);
        station.setChoiceGroup(choiceGroup);
        station.setX(x);
        station.setY(y);
        return station;
    }
}
