package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayEquipmentRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class EquipmentIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SpringSeasonRepository seasonRepository;
    @Autowired private SpringGameDayEquipmentRepository gameDayEquipmentRepository;
    @Autowired private SpringEquipmentItemRepository equipmentItemRepository;
    @Autowired private SpringGameDayRepository gameDayRepository;

    private SeasonEntity season;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
    }

    @AfterEach
    void tearDown() {
        gameDayEquipmentRepository.deleteAll();
        equipmentItemRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void gameDayEquipment_emptyByDefault() throws Exception {
        final var result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("date", "2026-06-27"))))
            .andExpect(status().isCreated())
            .andReturn();
        final Long gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void addToggleAndReload_persists() throws Exception {
        final Long gameDayId = createGameDay("2026-06-27");

        // Sache am Spieltag anlegen -> direkt used
        final var created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "name", "Pavillon", "category", "Aufbau", "quantity", 3,
                    "storageLocation", "Garage", "notes", "Häringe nicht vergessen"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.used").value(true))
            .andExpect(jsonPath("$.quantity").value(3))
            .andReturn();
        final Long itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Reload: Haken ist persistiert
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Pavillon"))
            .andExpect(jsonPath("$[0].storageLocation").value("Garage"))
            .andExpect(jsonPath("$[0].used").value(true));

        // Abhaken weg -> bleibt im Katalog, used=false
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/equipment/" + itemId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("used", false))))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].used").value(false));
    }

    @Test
    void deleteItem_cascadesUsage() throws Exception {
        final Long gameDayId = createGameDay("2026-06-27");
        final var created = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "name", "Bases", "category", "Spielmaterial", "quantity", 4))))
            .andReturn();
        final Long itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/equipment/" + itemId)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/equipment"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    private Long createGameDay(final String date) throws Exception {
        final var result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("date", date))))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }
}
