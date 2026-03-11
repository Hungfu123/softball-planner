package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.entity.Player;
import com.softball.repository.PlayerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser
class PlayerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void tearDown() {
        playerRepository.deleteAll();
    }

    @Test
    void createAndListPlayers() throws Exception {
        mockMvc.perform(post("/api/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Max"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Max"))
            .andExpect(jsonPath("$.id").isNumber());

        mockMvc.perform(get("/api/players"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Max')]").exists());
    }

    @Test
    void updatePlayer() throws Exception {
        final Player player = playerRepository.save(new Player("Max"));

        mockMvc.perform(put("/api/players/" + player.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Maximilian"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Maximilian"));

        assertThat(playerRepository.findById(player.getId()).get().getName()).isEqualTo("Maximilian");
    }

    @Test
    void deletePlayer() throws Exception {
        final Player player = playerRepository.save(new Player("Max"));

        mockMvc.perform(delete("/api/players/" + player.getId()))
            .andExpect(status().isNoContent());

        assertThat(playerRepository.findById(player.getId())).isEmpty();
    }
}
