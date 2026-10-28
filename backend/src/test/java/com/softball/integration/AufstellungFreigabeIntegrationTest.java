package com.softball.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringLineupEntryRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.service.AufstellungsFingerabdruck;

import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class AufstellungFreigabeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Autowired
    private SpringGameRepository gameRepository;

    @Autowired
    private GameDayRepository gameDayPort;

    @Autowired
    private TransactionTemplate transaktion;

    @Autowired
    private SpringLineupEntryRepository lineupEntryRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    private SeasonEntity season;
    private PlayerEntity spieler;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        spieler = playerRepository.save(new PlayerEntity("Max"));
    }

    @AfterEach
    void tearDown() {
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    private long neuerSpieltag() throws Exception {
        final String body = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-05-02", "label", "Spieltag 1"))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asLong();
    }

    @Test
    void spieltagKommtNichtFreigegebenAufDieWelt() throws Exception {
        final long id = neuerSpieltag();

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    private void freigeben(final long id, final String hash) {
        final var entity = gameDayRepository.findById(id).orElseThrow();
        entity.setLineupsReleasedAt(LocalDateTime.of(2026, 5, 1, 12, 0));
        entity.setLineupsReleasedHash(hash);
        gameDayRepository.save(entity);
    }

    @Test
    void freigegebenMitPassendemAbdruckIstNichtGeaendert() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, AufstellungsFingerabdruck.von(List.of(), List.of(), List.of()));

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsReleasedAt").value("2026-05-01T12:00:00"))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    @Test
    void freigegebenMitAnderemAbdruckIstGeaendert() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, "0".repeat(64));

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(true));
    }

    private long ersteSpielId(final long gameDayId) throws Exception {
        final String body = mockMvc.perform(get("/api/gamedays/" + gameDayId)).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("games").get(0).get("id").asLong();
    }

    private void stelleAufstellung(final long gameDayId) throws Exception {
        mockMvc.perform(put("/api/gamedays/" + gameDayId + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds", List.of(spieler.getId())))))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/games/" + ersteSpielId(gameDayId) + "/lineup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(
                    Map.of("playerId", spieler.getId(), "position", "SS", "battingOrder", 1)))))
            .andExpect(status().isOk());
    }

    @Test
    void nichtFreigegebenBleibtFalseAuchMitEchterAufstellung() throws Exception {
        final long id = neuerSpieltag();
        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/gamedays"))
            .andExpect(jsonPath("$[0].lineupsChangedSinceRelease").value(false));
    }

    @Test
    void aufstellungNachDerFreigabeSetztDenHaken() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, AufstellungsFingerabdruck.von(List.of(), List.of(), List.of()));
        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(true));
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/gamedays"))
            .andExpect(jsonPath("$[0].lineupsChangedSinceRelease").value(true));
    }

    @Test
    void dieFreigabeUeberlebtEinSpeichernDesSpieltags() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, "a".repeat(64));

        mockMvc.perform(put("/api/gamedays/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", "2026-05-02", "label", "Anderes Label"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.label").value("Anderes Label"))
            .andExpect(jsonPath("$.lineupsReleasedAt").value("2026-05-01T12:00:00"));

        final var gespeichert = gameDayRepository.findById(id).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(gespeichert.getLineupsReleasedHash()).isEqualTo("a".repeat(64));
    }

    @Test
    void dieFreigabeUeberlebtEineAenderungDerVerfuegbarkeit() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, "a".repeat(64));

        mockMvc.perform(put("/api/gamedays/" + id + "/players")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("playerIds", List.of(spieler.getId())))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineupsReleasedAt").value("2026-05-01T12:00:00"));
    }

    /**
     * Task 2 gibt frei, indem es die Felder am Domaenenobjekt setzt und speichert. Dafuer
     * muss {@code GameDayMapper.updateEntity} sie in die Entity schreiben — sonst bliebe
     * die Freigabe stumm im Speicher und nie in der Datenbank.
     */
    @Test
    void eineFreigabeAmDomaenenobjektWirdBeimSpeichernGeschrieben() throws Exception {
        final long id = neuerSpieltag();

        transaktion.executeWithoutResult(status -> {
            final var tag = gameDayPort.findById(id).orElseThrow();
            tag.setLineupsReleasedAt(LocalDateTime.of(2026, 5, 1, 12, 0));
            tag.setLineupsReleasedHash("b".repeat(64));
            gameDayPort.save(tag);
        });

        final var gespeichert = gameDayRepository.findById(id).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(gespeichert.getLineupsReleasedAt())
            .isEqualTo(LocalDateTime.of(2026, 5, 1, 12, 0));
        org.assertj.core.api.Assertions.assertThat(gespeichert.getLineupsReleasedHash()).isEqualTo("b".repeat(64));
    }
}
