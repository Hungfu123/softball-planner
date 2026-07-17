package com.softball.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.SyncedVoteEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSyncedVoteRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class WhatsappVoteControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringPlayerRepository playerRepository;

    @Autowired
    private SpringTrainingRepository trainingRepository;

    @Autowired
    private SpringSyncedVoteRepository voteRepository;

    @AfterEach
    void tearDown() {
        voteRepository.deleteAll();
        trainingRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void sync_noPolls_returnsZero() throws Exception {
        mockMvc.perform(post("/api/orga/whatsapp/sync"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.synced").value(0));
    }

    @Test
    void unknownVoters_listsOpenVotes() throws Exception {
        final TrainingEntity training = trainingRepository.save(new TrainingEntity(LocalDate.of(2026, 7, 20), "18:00", "Platz 1"));
        final SyncedVoteEntity vote = new SyncedVoteEntity();
        vote.setTrainingId(training.getId());
        vote.setVoterName("Layla");
        vote.setPlayerId(null);
        vote.setPresent(true);
        voteRepository.save(vote);

        mockMvc.perform(get("/api/orga/whatsapp/unknown-voters"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.voterName == 'Layla')]").exists())
            .andExpect(jsonPath("$[?(@.voterName == 'Layla')].trainingId").value(training.getId().intValue()))
            .andExpect(jsonPath("$[?(@.voterName == 'Layla')].trainingDate").value("2026-07-20"));
    }

    @Test
    void assign_existingPlayer_setsWhatsappNameAndRematches() throws Exception {
        final TrainingEntity training = trainingRepository.save(new TrainingEntity(LocalDate.of(2026, 7, 20), "18:00", "Platz 1"));
        final PlayerEntity player = playerRepository.save(new PlayerEntity("Max"));
        final SyncedVoteEntity vote = new SyncedVoteEntity();
        vote.setTrainingId(training.getId());
        vote.setVoterName("Layla");
        vote.setPlayerId(null);
        vote.setPresent(true);
        voteRepository.save(vote);

        mockMvc.perform(post("/api/orga/whatsapp/assign")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("voterName", "Layla", "playerId", player.getId()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Max"))
            .andExpect(jsonPath("$.whatsappName").value("Layla"));

        assertThat(playerRepository.findById(player.getId()).orElseThrow().getWhatsappName()).isEqualTo("Layla");
        assertThat(voteRepository.findByPlayerIdIsNull()).isEmpty();
    }

    @Test
    void assignNew_createsPlayerAndSetsWhatsappName() throws Exception {
        mockMvc.perform(post("/api/orga/whatsapp/assign-new")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("voterName", "Mia", "playerName", "Neue Spielerin"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Neue Spielerin"))
            .andExpect(jsonPath("$.whatsappName").value("Mia"))
            .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    void assign_blankVoterName_returns400() throws Exception {
        final PlayerEntity player = playerRepository.save(new PlayerEntity("Max"));

        mockMvc.perform(post("/api/orga/whatsapp/assign")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("voterName", "", "playerId", player.getId()))))
            .andExpect(status().isBadRequest());
    }
}
