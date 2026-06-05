package com.softball.domain.model;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingPlanSectionSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Test
    void roundTripsStationsOnContent() throws Exception {
        TrainingStation s = new TrainingStation();
        s.setType(StationType.TEE);
        s.setLabel("Tee leicht");
        s.setLevel(StationLevel.BEGINNER);
        s.setChoiceGroup(1);

        TrainingPlanContent content = new TrainingPlanContent(List.of(), null, null);
        content.setStations(List.of(s));

        String json = mapper.writeValueAsString(content);
        TrainingPlanContent back = mapper.readValue(json, TrainingPlanContent.class);

        assertThat(back.getStations()).hasSize(1);
        assertThat(back.getStations().get(0).getType()).isEqualTo(StationType.TEE);
        assertThat(back.getStations().get(0).getLabel()).isEqualTo("Tee leicht");
        assertThat(back.getStations().get(0).getLevel()).isEqualTo(StationLevel.BEGINNER);
        assertThat(back.getStations().get(0).getChoiceGroup()).isEqualTo(1);
    }

    @Test
    void legacyContentWithoutStationsDeserializes() throws Exception {
        String legacy = "{\"sections\":[],\"overallNotes\":\"x\"}";

        TrainingPlanContent back = mapper.readValue(legacy, TrainingPlanContent.class);

        assertThat(back.getStations()).isNull();
        assertThat(back.getOverallNotes()).isEqualTo("x");
    }
}
