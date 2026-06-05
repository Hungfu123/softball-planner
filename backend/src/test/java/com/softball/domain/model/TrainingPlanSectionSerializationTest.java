package com.softball.domain.model;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingPlanSectionSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Test
    void roundTripsStationFields() throws Exception {
        TrainingPlanSection section = new TrainingPlanSection();
        section.setTitle("Tee-Drill");
        section.setStationType(StationType.TEE);
        section.setStationLevel(StationLevel.BEGINNER);
        section.setStationChoiceGroup(1);

        String json = mapper.writeValueAsString(section);
        TrainingPlanSection back = mapper.readValue(json, TrainingPlanSection.class);

        assertThat(back.getStationType()).isEqualTo(StationType.TEE);
        assertThat(back.getStationLevel()).isEqualTo(StationLevel.BEGINNER);
        assertThat(back.getStationChoiceGroup()).isEqualTo(1);
    }

    @Test
    void legacyJsonWithoutStationFieldsDeserializes() throws Exception {
        String legacy = "{\"title\":\"Alt\",\"sectionType\":\"BATTING\"}";

        TrainingPlanSection back = mapper.readValue(legacy, TrainingPlanSection.class);

        assertThat(back.getStationType()).isNull();
        assertThat(back.getStationLevel()).isNull();
        assertThat(back.getStationChoiceGroup()).isNull();
    }
}
