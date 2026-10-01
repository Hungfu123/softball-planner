package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.softball.TestcontainersConfig;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class SeasonCopyYearIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringLeagueTeamRepository leagueTeamRepository;

    @AfterEach
    void tearDown() {
        leagueTeamRepository.deleteAll();
        seasonRepository.deleteAll();
    }

    @Test
    void copyYear_createsLeaguesWithOwnTeamAndCopiesOpponents() throws Exception {
        final SeasonEntity college = seasonRepository.save(new SeasonEntity("College Series", 2026));
        final SeasonEntity rfl = seasonRepository.save(new SeasonEntity("Ruhr Fun Liga", 2026));
        leagueTeamRepository.save(new LeagueTeamEntity(college, "Dead Sox", true));
        leagueTeamRepository.save(new LeagueTeamEntity(college, "Aachen Aixplosives", false));
        leagueTeamRepository.save(new LeagueTeamEntity(rfl, "Dead Sox", true));
        leagueTeamRepository.save(new LeagueTeamEntity(rfl, "Cologne Cardinals", false));

        mockMvc.perform(post("/api/seasons/copy-year")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("templateYear", 2026, "targetYear", 2027, "copyTeams", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.createdSeasons.length()").value(2))
            .andExpect(jsonPath("$.skippedSeasons.length()").value(0))
            .andExpect(jsonPath("$.copiedTeams").value(2));

        // Neue Ligen existieren mit eigenem Team + kopierten Gegnern
        final var season2027 = seasonRepository.findAll().stream()
            .filter(s -> s.getYear() == 2027).toList();
        assertThat(season2027).hasSize(2);
        final SeasonEntity college2027 = season2027.stream()
            .filter(s -> "College Series".equals(s.getName())).findFirst().orElseThrow();
        final var teamsCollege2027 = leagueTeamRepository.findAll().stream()
            .filter(t -> t.getSeason().getId().equals(college2027.getId())).toList();
        assertThat(teamsCollege2027).hasSize(2); // Dead Sox (own) + Aachen Aixplosives
        assertThat(teamsCollege2027.stream()
            .filter(LeagueTeamEntity::isOwnTeam)
            .allMatch(t -> "Dead Sox".equals(t.getName()))).isTrue();
        // Vorlagen-Jahr unangetastet
        assertThat(seasonRepository.findAll().stream().filter(s -> s.getYear() == 2026)).hasSize(2);
    }

    @Test
    void copyYear_skipsExistingLeaguesAndIsIdempotent() throws Exception {
        seasonRepository.save(new SeasonEntity("College Series", 2026));
        seasonRepository.save(new SeasonEntity("Indoor Series", 2026));
        // College Series existiert bereits im Ziel-Jahr — muss übersprungen werden, Indoor wird neu angelegt
        seasonRepository.save(new SeasonEntity("College Series", 2027));

        final String body = objectMapper.writeValueAsString(
            Map.of("templateYear", 2026, "targetYear", 2027, "copyTeams", true));

        mockMvc.perform(post("/api/seasons/copy-year").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.createdSeasons.length()").value(1))
            .andExpect(jsonPath("$.createdSeasons[0]").value("Indoor Series"))
            .andExpect(jsonPath("$.skippedSeasons.length()").value(1))
            .andExpect(jsonPath("$.skippedSeasons[0]").value("College Series"));

        // Zweiter Lauf: nichts Neues, beide werden übersprungen
        mockMvc.perform(post("/api/seasons/copy-year").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.createdSeasons.length()").value(0))
            .andExpect(jsonPath("$.skippedSeasons.length()").value(2));
    }

    @Test
    void copyYear_sameYear_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/copy-year")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("templateYear", 2026, "targetYear", 2026, "copyTeams", false))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("identisch")));

        assertThat(seasonRepository.count()).isZero(); // nichts angelegt
    }

    @Test
    void copyYear_templateWithoutSeasons_returns400() throws Exception {
        mockMvc.perform(post("/api/seasons/copy-year")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("templateYear", 2030, "targetYear", 2031, "copyTeams", false))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("keine Ligen")));
    }
}
