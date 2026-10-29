package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.application.AuditService;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AuditEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.shared.config.SchedulingConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.request.RequestContextHolder;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import com.softball.shared.config.AuditFilter;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Die Historie: der Filter schreibt jeden erfolgreichen Schreibvorgang, der Dienst fasst
 * Scoring-Zeilen beim Lesen zusammen. Zeilen fuer die Zusammenfassung werden mit festen
 * Zeitstempeln direkt ueber den Port angelegt, damit die Abstaende exakt sind.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class AuditIntegrationTest {

    private static final Instant T0 = Instant.parse("2026-10-17T19:00:00Z");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private AuditEventRepository auditEvents;
    @MockitoSpyBean private AuditService auditService;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private PlayerRepository playerRepository;
    @Autowired private SchedulingConfig.AuditCleanup auditCleanup;

    private final List<Long> angelegteSpieler = new ArrayList<>();

    @BeforeEach
    void vorbereiten() {
        // Das Testprofil baut sein Schema per create-drop ohne Flyway: den Fremdschluessel aus V71
        // nachbauen, sonst pruefte der Namens-Schnappschuss nur eine Spalte ohne Referenz.
        jdbc.execute("""
                do $$ begin
                  if not exists (select 1 from pg_constraint where conname = 'fk_audit_event_user') then
                    alter table audit_event add constraint fk_audit_event_user
                      foreign key (user_id) references app_user (id) on delete set null;
                  end if;
                end $$""");
        jdbc.update("delete from audit_event");
    }

    @AfterEach
    void aufraeumen() {
        angelegteSpieler.forEach(playerRepository::deleteById);
        jdbc.update("delete from audit_event");
        jdbc.update("update app_user set last_seen_at = null where lower(username) = 'hung'");
    }

    private Long spielerAnlegen(final String name) throws Exception {
        final String json = mockMvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        final Long id = Long.valueOf(json.replaceAll(".*\"id\":(\\d+).*", "$1"));
        angelegteSpieler.add(id);
        return id;
    }

    private int zeilen(final String where) {
        return jdbc.queryForObject("select count(*) from audit_event where " + where, Integer.class);
    }

    private void scoring(final String user, final long gameId, final Instant at) {
        auditEvents.save(new AuditEvent(null, null, user, AuditKind.SCORING, "POST",
                "/api/games/" + gameId + "/atbats", "At-Bat eingetragen", "GAME", gameId, 200, at));
    }

    @Test
    void schreibtEinenEintragFuerJedenErfolgreichenSchreibvorgang() throws Exception {
        final Long id = spielerAnlegen("Audit Anna");
        mockMvc.perform(put("/api/players/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Audit Anja\",\"regular\":true}"))
                .andExpect(status().isOk());

        assertThat(zeilen("method = 'POST' and path = '/api/players' and status = 201 and username = 'hung'"))
                .isEqualTo(1);
        assertThat(zeilen("method = 'PUT' and path = '/api/players/" + id + "' and status = 200")).isEqualTo(1);
        assertThat(zeilen("true")).isEqualTo(2);
        assertThat(zeilen("user_id is not null and username = 'hung'")).isEqualTo(2);

        mockMvc.perform(get("/api/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eintraege.length()").value(2))
                .andExpect(jsonPath("$.eintraege[0].label").value("Spieler geändert"))
                .andExpect(jsonPath("$.eintraege[0].targetType").value("PLAYER"))
                .andExpect(jsonPath("$.eintraege[0].targetId").value(id))
                .andExpect(jsonPath("$.eintraege[1].label").value("Spieler angelegt"));
    }

    @Test
    void eineKaputteHistorienZeileKipptDieAntwortNicht() throws Exception {
        Mockito.doThrow(new IllegalStateException("Datenbank weg")).when(auditService)
                .record(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                        Mockito.any(), Mockito.any());
        final Logger filterLog = (Logger) LoggerFactory.getLogger(AuditFilter.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        filterLog.addAppender(appender);
        try {
            spielerAnlegen("Audit Kaputt"); // erwartet 201 trotz geworfener Ausnahme

            assertThat(zeilen("true")).isZero();
            assertThat(appender.list).filteredOn(e -> e.getLevel() == Level.WARN)
                    .anyMatch(e -> e.getFormattedMessage().contains("POST /api/players"));
        } finally {
            filterLog.detachAppender(appender);
            Mockito.reset(auditService);
        }
    }

    @Test
    void schreibtKeinenEintragFuerEinenLesezugriff() throws Exception {
        mockMvc.perform(get("/api/players")).andExpect(status().isOk());
        mockMvc.perform(get("/api/audit")).andExpect(status().isOk());

        assertThat(zeilen("true")).isZero();
    }

    @Test
    void schreibtKeinenEintragWennDerAufrufFehlschlug() throws Exception {
        mockMvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/players/999999").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nie da\",\"regular\":true}"))
                .andExpect(status().isNotFound());

        assertThat(zeilen("true")).isZero();
    }

    @Test
    void haeltDenBenutzernamenAuchNachdemDerAccountWegIst() {
        final Player spieler = playerRepository.save(new Player("Audit Weg"));
        final AppUser konto = new AppUser();
        konto.setPlayerId(spieler.getId());
        konto.setUsername("weg");
        konto.setPasswordHash("{noop}x");
        konto.setRole(Role.PLAYER);
        konto.setCreatedAt(Instant.now());
        final AppUser gespeichert = appUserRepository.save(konto);
        auditService.record("weg", AuditKind.WRITE, "PUT", "/api/irgendwas", null, null, null, 200);
        assertThat(zeilen("username = 'weg' and user_id = " + gespeichert.getId())).isEqualTo(1);

        appUserRepository.deleteById(gespeichert.getId());
        playerRepository.deleteById(spieler.getId());

        assertThat(appUserRepository.findById(gespeichert.getId())).isEmpty();
        assertThat(zeilen("username = 'weg' and user_id is null")).isEqualTo(1);
    }

    /**
     * Der Grund fuer die Spalte: wer sich einen Fantasienamen gibt, soll trotzdem zuordenbar
     * bleiben — und zwar auch mit den Zeilen, die er unter dem ALTEN Namen geschrieben hat.
     * Aufgeloest wird deshalb ueber die userId, nicht ueber den Namen im Ereignis.
     */
    @Test
    void nenntDenSpielerAuchFuerZeilenUnterEinemFrueherenBenutzernamen() {
        final Player spieler = playerRepository.save(new Player("Audit Umbenannt"));
        final AppUser konto = new AppUser();
        konto.setPlayerId(spieler.getId());
        konto.setUsername("vorher");
        konto.setPasswordHash("{noop}x");
        konto.setRole(Role.PLAYER);
        konto.setCreatedAt(Instant.now());
        final AppUser gespeichert = appUserRepository.save(konto);

        auditService.record("vorher", AuditKind.WRITE, "PUT", "/api/irgendwas", "Etwas geaendert", null, null, 200);
        appUserRepository.updateUsername(gespeichert.getId(), "ballermann99");

        final List<AuditService.Zeile> zeilen = auditService.verlauf(
                new com.softball.domain.model.AuditQuery(gespeichert.getId(), null, null, null)).zeilen();

        assertThat(zeilen).hasSize(1);
        assertThat(zeilen.get(0).span().username()).isEqualTo("vorher"); // Schnappschuss bleibt
        assertThat(zeilen.get(0).playerName()).isEqualTo("Audit Umbenannt"); // trotzdem zuordenbar

        appUserRepository.deleteById(gespeichert.getId());
        playerRepository.deleteById(spieler.getId());
    }

    @Test
    void fasstAufeinanderfolgendeScoringZeilenZuEinerSpanneZusammen() throws Exception {
        // hung, Spiel 7: Abstaende 8 und 13 Minuten, die Spanne insgesamt 21 Minuten (kettet, nicht ab Beginn)
        scoring("hung", 7, T0.plusSeconds(4 * 60));
        scoring("hung", 7, T0.plusSeconds(12 * 60));
        scoring("hung", 7, T0.plusSeconds(25 * 60));
        // dazwischen: ein anderer Nutzer am selben Spiel und derselbe Nutzer an einem anderen Spiel
        scoring("anna", 7, T0.plusSeconds(8 * 60));
        scoring("hung", 8, T0.plusSeconds(9 * 60));

        mockMvc.perform(get("/api/audit").param("kind", "SCORING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eintraege.length()").value(3)) // ohne Zusammenfassung waeren es fuenf
                .andExpect(jsonPath("$.eintraege[?(@.username=='hung' && @.targetId==7)].count").value(3))
                .andExpect(jsonPath("$.eintraege[?(@.username=='hung' && @.targetId==7)].from").value("2026-10-17T19:04:00Z"))
                .andExpect(jsonPath("$.eintraege[?(@.username=='hung' && @.targetId==7)].to").value("2026-10-17T19:25:00Z"))
                .andExpect(jsonPath("$.eintraege[?(@.username=='anna' && @.targetId==7)].count").value(1))
                .andExpect(jsonPath("$.eintraege[?(@.username=='hung' && @.targetId==8)].count").value(1));
    }

    @Test
    void trenntZweiScoringSpannenMitGrosserLuecke() throws Exception {
        // Spiel 20: 36 Minuten Pause -> zwei Spannen; danach genau 20 Minuten -> "weniger als" 20, also getrennt
        scoring("hung", 20, T0.plusSeconds(4 * 60));
        scoring("hung", 20, T0.plusSeconds(40 * 60));
        scoring("hung", 20, T0.plusSeconds(60 * 60));
        // Spiel 21: 19 Minuten 59 Sekunden -> noch eine Spanne
        scoring("hung", 21, T0);
        scoring("hung", 21, T0.plusSeconds(19 * 60 + 59));

        mockMvc.perform(get("/api/audit").param("kind", "SCORING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eintraege.length()").value(4))
                .andExpect(jsonPath("$.eintraege[?(@.targetId==20)].count").value(org.hamcrest.Matchers.contains(1, 1, 1)))
                .andExpect(jsonPath("$.eintraege[?(@.targetId==21)].count").value(2));
    }

    @Test
    void fasstNurScoringZusammenSchreibvorgaengeBleibenEinzeln() throws Exception {
        for (int i = 0; i < 3; i++) {
            auditEvents.save(new AuditEvent(null, null, "hung", AuditKind.WRITE, "PUT", "/api/games/9/lineup",
                    "Lineup geändert", "GAME", 9L, 200, T0.plusSeconds(60L * i)));
        }

        mockMvc.perform(get("/api/audit").param("kind", "WRITE"))
                .andExpect(jsonPath("$.eintraege.length()").value(3))
                .andExpect(jsonPath("$.eintraege[0].count").value(1));
    }

    @Test
    void uebersetztBekanntePfadeInDeutschenKlartext() throws Exception {
        mockMvc.perform(post("/api/auth/login")).andExpect(status().isOk());
        final Long id = spielerAnlegen("Audit Klartext");

        mockMvc.perform(get("/api/audit").param("kind", "LOGIN"))
                .andExpect(jsonPath("$.eintraege.length()").value(1))
                .andExpect(jsonPath("$.eintraege[0].label").value("Angemeldet"));
        mockMvc.perform(get("/api/audit").param("kind", "WRITE"))
                .andExpect(jsonPath("$.eintraege[0].label").value("Spieler angelegt"));
        assertThat(zeilen("label = 'Spieler angelegt' and target_id is null")).isEqualTo(1);
        assertThat(id).isNotNull();
    }

    @Test
    void zeigtUnbekanntePfadeAlsMethodeUndPfad() throws Exception {
        auditService.record("hung", AuditKind.WRITE, "POST", "/api/neu/ding", null, null, null, 200);

        mockMvc.perform(get("/api/audit"))
                .andExpect(jsonPath("$.eintraege.length()").value(1))
                .andExpect(jsonPath("$.eintraege[0].label").value("POST /api/neu/ding"));
    }

    @Test
    @WithMockUser(username = "hung", roles = "ADMIN")
    void adminSiehtDieHistorieNicht() throws Exception {
        mockMvc.perform(get("/api/audit")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/audit/last-seen")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "hung", roles = "PLAYER")
    void einSpielerSiehtDieHistorieNicht() throws Exception {
        mockMvc.perform(get("/api/audit")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/audit/last-seen")).andExpect(status().isForbidden());
    }

    @Test
    void zeigtWerZuletztDaWar() throws Exception {
        // In der Zukunft, damit kein Rest aus anderen Tests (Accounts mit juengerem lastSeen) davorsteht.
        appUserRepository.touchLastSeen("hung", Instant.parse("2999-01-01T10:00:00Z"));

        mockMvc.perform(get("/api/audit/last-seen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("hung"))
                .andExpect(jsonPath("$[0].lastSeenAt").value("2999-01-01T10:00:00Z"));
    }

    @Test
    void raeumtEintraegeAelterAlsZwoelfMonateAuf() throws Exception {
        final ZonedDateTime jetzt = ZonedDateTime.now(ZoneId.systemDefault());
        auditService.record("hung", AuditKind.WRITE, "PUT", "/alt", null, null, null, 200);
        auditEvents.save(new AuditEvent(null, null, "hung", AuditKind.WRITE, "PUT", "/zu-alt", null, null, null, 200,
                jetzt.minusMonths(13).toInstant()));
        auditEvents.save(new AuditEvent(null, null, "hung", AuditKind.WRITE, "PUT", "/knapp-zu-alt", null, null, null,
                200, jetzt.minusMonths(12).minusDays(1).toInstant()));
        auditEvents.save(new AuditEvent(null, null, "hung", AuditKind.WRITE, "PUT", "/knapp-drin", null, null, null,
                200, jetzt.minusMonths(11).minusDays(28).toInstant()));

        // Wie der Scheduler: eigener Thread, ohne Anfrage und ohne Anmeldung. Ein CurrentUser
        // (@RequestScope) wuerfe hier; der Testthread selbst traegt Anfrage-Attribute und taugt dafuer nicht.
        CompletableFuture.runAsync(() -> {
            assertThat(RequestContextHolder.getRequestAttributes()).isNull();
            auditCleanup.raeumeAuf();
        }).get(30, TimeUnit.SECONDS);

        final List<String> uebrig = jdbc.queryForList("select path from audit_event order by path", String.class);
        assertThat(uebrig).containsExactly("/alt", "/knapp-drin");
    }
}
