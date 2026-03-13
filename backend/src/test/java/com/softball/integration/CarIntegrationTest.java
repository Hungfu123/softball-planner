package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class CarIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private SpringCarRepository carRepository;

    private PlayerEntity player1, player2, player3, player4;
    private Long gameDayId;

    @BeforeEach
    void setUp() throws Exception {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        player1 = playerRepository.save(new PlayerEntity("Max"));
        player2 = playerRepository.save(new PlayerEntity("Lisa"));
        player3 = playerRepository.save(new PlayerEntity("Tom"));
        player4 = playerRepository.save(new PlayerEntity("Anna"));

        final MvcResult result = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-03-15"))))
            .andReturn();

        gameDayId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player1.getId(), player2.getId(), player3.getId(), player4.getId())))));
    }

    @AfterEach
    void tearDown() {
        carRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void createAndGetCar() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.driver.name").value("Max"))
            .andExpect(jsonPath("$.totalSeats").value(5))
            .andExpect(jsonPath("$.direction").value("both"))
            .andExpect(jsonPath("$.gameDayId").value(gameDayId));

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/cars"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].driver.name").value("Max"));
    }

    @Test
    void updateCar() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))))
            .andReturn();

        final Long carId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/cars/" + carId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "totalSeats", 3, "direction", "there"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalSeats").value(3))
            .andExpect(jsonPath("$.direction").value("there"));
    }

    @Test
    void deleteCar() throws Exception {
        final MvcResult result = mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))))
            .andReturn();

        final Long carId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/cars/" + carId))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/cars"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deleteCar_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/cars/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createCar_driverNotAvailable_returns400() throws Exception {
        final PlayerEntity unavailable = playerRepository.save(new PlayerEntity("Unbekannt"));

        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", unavailable.getId(), "totalSeats", 5, "direction", "both"))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createCar_duplicateDriver_returns400() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))));

        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 3, "direction", "there"))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void cascade_removedDriverDeletesCar() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))))
            .andExpect(status().isCreated());

        // Fahrer (player1) aus verfuegbaren Spielern entfernen
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("playerIds",
                List.of(player2.getId(), player3.getId(), player4.getId())))));

        // Auto sollte geloescht sein
        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/cars"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void multipleCars_differentDrivers() throws Exception {
        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player1.getId(), "totalSeats", 5, "direction", "both"))))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/gamedays/" + gameDayId + "/cars")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "driverPlayerId", player2.getId(), "totalSeats", 3, "direction", "there"))))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/gamedays/" + gameDayId + "/cars"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }
}
