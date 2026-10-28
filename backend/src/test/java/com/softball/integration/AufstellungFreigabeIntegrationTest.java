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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.service.AufstellungsFingerabdruck;

import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfig.class, com.softball.SetzbareUhr.Konfiguration.class})
@MitSuperadmin
class AufstellungFreigabeIntegrationTest {

    private static final RequestPostProcessor ADMIN = user("admin").roles("ADMIN");
    private static final RequestPostProcessor SPIELER = user("spieler").roles("PLAYER");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.softball.SetzbareUhr uhr;

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

    @Autowired
    private com.softball.domain.port.out.AppUserRepository appUserRepository;

    private SeasonEntity season;
    private PlayerEntity spieler;

    @BeforeEach
    void setUp() {
        season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        spieler = playerRepository.save(new PlayerEntity("Max"));
    }

    @AfterEach
    void tearDown() {
        uhr.freigeben();
        appUserRepository.findByUsername("scorer-freigabe").ifPresent(a -> appUserRepository.deleteById(a.getId()));
        lineupEntryRepository.deleteAll();
        gameRepository.deleteAll();
        gameDayRepository.deleteAll();
        seasonRepository.deleteAll();
        playerRepository.deleteAll();
    }

    private long neuerSpieltag() throws Exception {
        return neuerSpieltag(LocalDate.now().plusDays(7));
    }

    private long neuerSpieltag(final LocalDate datum) throws Exception {
        final String body = mockMvc.perform(post("/api/seasons/" + season.getId() + "/gamedays")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", datum.toString(), "label", "Spieltag 1"))))
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

    /** Die Antwort traegt einen Offset; verglichen wird der Zeitpunkt, nicht die Schreibweise. */
    private static org.hamcrest.Matcher<String> gleicherZeitpunkt(final LocalDateTime wanduhr) {
        final var erwartet = wanduhr.atZone(java.time.ZoneId.systemDefault()).toInstant();
        return new org.hamcrest.TypeSafeMatcher<>() {
            @Override
            protected boolean matchesSafely(final String text) {
                return java.time.OffsetDateTime.parse(text).toInstant().equals(erwartet);
            }

            @Override
            public void describeTo(final org.hamcrest.Description d) {
                d.appendText("Zeitpunkt ").appendValue(erwartet);
            }
        };
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
            .andExpect(jsonPath("$.lineupsReleasedAt", gleicherZeitpunkt(LocalDateTime.of(2026, 5, 1, 12, 0))))
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

    /**
     * Der Haken beantwortet "der Stand, den ich freigegeben habe, ist nicht mehr der, der
     * dasteht" — das fragt man vor dem Spiel. Ein vergangener Spieltag meldet deshalb immer
     * false, auch bei nachtraeglicher Aenderung; das spart dem Kalender-Feed die Rechnung.
     */
    @Test
    void einVergangenerSpieltagMeldetNieGeaendert() throws Exception {
        final long id = neuerSpieltag(LocalDate.now().minusDays(7));
        freigeben(id, AufstellungsFingerabdruck.von(List.of(), List.of(), List.of()));
        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
        mockMvc.perform(get("/api/seasons/" + season.getId() + "/gamedays"))
            .andExpect(jsonPath("$[0].lineupsChangedSinceRelease").value(false));
    }

    @Test
    void dieFreigabeUeberlebtEinSpeichernDesSpieltags() throws Exception {
        final long id = neuerSpieltag();
        freigeben(id, "a".repeat(64));

        mockMvc.perform(put("/api/gamedays/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("date", LocalDate.now().plusDays(7).toString(), "label", "Anderes Label"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.label").value("Anderes Label"))
            .andExpect(jsonPath("$.lineupsReleasedAt", gleicherZeitpunkt(LocalDateTime.of(2026, 5, 1, 12, 0))));

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
            .andExpect(jsonPath("$.lineupsReleasedAt", gleicherZeitpunkt(LocalDateTime.of(2026, 5, 1, 12, 0))));
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

    private void schalte(final long id, final boolean freigegeben) throws Exception {
        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"released\":" + freigegeben + "}"))
            .andExpect(status().isOk());
    }

    @Test
    void adminGibtFreiUndNimmtZurueck() throws Exception {
        final long id = neuerSpieltag();

        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineupsReleasedAt").isNotEmpty())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));

        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist());

        final var gespeichert = gameDayRepository.findById(id).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(gespeichert.getLineupsReleasedHash()).isNull();
    }

    @Test
    void einSpielerDarfNichtFreigeben() throws Exception {
        final long id = neuerSpieltag();

        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(SPIELER)
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":true}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void freigebenOhneWertIstEinFehler() throws Exception {
        final long id = neuerSpieltag();

        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void eineAenderungNachDerFreigabeNimmtSieNichtZurueck() throws Exception {
        final long id = neuerSpieltag();
        schalte(id, true);
        final String freigegebenAm = objectMapper.readTree(mockMvc.perform(get("/api/gamedays/" + id))
            .andReturn().getResponse().getContentAsString()).get("lineupsReleasedAt").asText();

        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsReleasedAt").value(freigegebenAm))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(true));
    }

    @Test
    void erneutFreigebenSetztDenHakenZurueck() throws Exception {
        final long id = neuerSpieltag();
        schalte(id, true);
        stelleAufstellung(id);

        mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content("{\"released\":true}"))
            .andExpect(jsonPath("$.lineupsReleasedAt").isNotEmpty())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    @Test
    void ohneFreigabeGibtEsKeinGeaendert() throws Exception {
        final long id = neuerSpieltag();
        schalte(id, true);
        schalte(id, false);

        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist())
            .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
    }

    private static final java.time.ZoneId BERLIN = java.time.ZoneId.of("Europe/Berlin");

    /** Ein Scorer ist ein PLAYER-Konto mit may_score; die Regel liest das aus der Datenbank. */
    private void legeScorerKontoAn() {
        if (appUserRepository.findByUsername("scorer-freigabe").isPresent()) {
            return;
        }
        final var account = new com.softball.domain.model.AppUser();
        account.setPlayerId(spieler.getId());
        account.setUsername("scorer-freigabe");
        account.setPasswordHash("{noop}x");
        account.setRole(com.softball.domain.model.Role.PLAYER);
        account.setMayScore(true);
        account.setCreatedAt(java.time.Instant.now());
        appUserRepository.save(account);
    }

    private RequestPostProcessor scorerKonto() {
        legeScorerKontoAn();
        return user("scorer-freigabe").roles("PLAYER");
    }

    @Test
    void scorerSiehtKuenftigenNichtFreigegebenenSpieltagNicht() throws Exception {
        final long id = neuerSpieltag(LocalDate.now(BERLIN).plusDays(7));
        stelleAufstellung(id);

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(scorerKonto()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineups").isEmpty());
        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(ADMIN))
            .andExpect(jsonPath("$.lineups").isNotEmpty());
        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("GESPERRT"));
    }

    @Test
    void scorerSiehtDenHeutigenSpieltagAuchVorSieben() throws Exception {
        final long id = neuerSpieltag(LocalDate.of(2026, 7, 4));
        stelleAufstellung(id);
        uhr.setzeAuf("2026-07-04T04:59:00Z"); // 06:59 Berlin (UTC+2)

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("HEUTE_VOR_SIEBEN"));
        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(scorerKonto()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lineups").isNotEmpty());
        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(SPIELER))
            .andExpect(jsonPath("$.lineups").isEmpty());
    }

    /** Ab 07:00 Berliner Zeit sehen alle — ohne dass freigegeben wurde. */
    @Test
    void abSiebenSiehtJederDenHeutigenSpieltagOhneDassFreigegebenWurde() throws Exception {
        final long id = neuerSpieltag(LocalDate.of(2026, 7, 4));
        stelleAufstellung(id);
        uhr.setzeAuf("2026-07-04T05:01:00Z"); // 07:01 Berlin (UTC+2)

        mockMvc.perform(get("/api/gamedays/" + id + "/lineups").with(SPIELER))
            .andExpect(jsonPath("$.lineups").isNotEmpty());
        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("OFFEN_AB_SIEBEN"))
            .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist());
    }

    /** Der Knopf "zuruecknehmen" haengt an FREIGEGEBEN; ab 07:00 am Spieltag bewirkte er nichts. */
    @Test
    void freigegebenAmSpieltagTraegtDieLageJeNachUhr() throws Exception {
        final long id = neuerSpieltag(LocalDate.of(2026, 7, 4));
        freigeben(id, "a".repeat(64));

        uhr.setzeAuf("2026-07-04T04:59:00Z");
        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("FREIGEGEBEN"));
        uhr.setzeAuf("2026-07-04T05:01:00Z");
        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("OFFEN_AB_SIEBEN"));
    }

    @Test
    void einVergangenerFreigegebenerSpieltagTraegtDieLageVergangen() throws Exception {
        final long id = neuerSpieltag(LocalDate.now(BERLIN).minusDays(7));
        freigeben(id, "a".repeat(64));

        mockMvc.perform(get("/api/gamedays/" + id))
            .andExpect(jsonPath("$.aufstellungsLage").value("OFFEN_VERGANGEN"));
    }
}
