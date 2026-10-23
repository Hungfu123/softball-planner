package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestAccounts;
import com.softball.TestcontainersConfig;
import com.softball.adapter.dto.DataExport;
import com.softball.application.AccountSelfService;
import com.softball.application.DataImportService;
import com.softball.application.PlayerService;
import com.softball.application.UserAccountService;
import com.softball.application.VerteiltesPasswort;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Accounts verwalten. Der Block "gleichzeitige Aenderungen" haelt fest, dass nie eine ganze Zeile
 * mit altem Stand zurueckgeschrieben wird: eine Sperre, eine Umbenennung oder ein neues Passwort
 * ueberleben die jeweils andere Aenderung, auch wenn sie zwischen Lesen und Schreiben eintrifft.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class UserAccountIntegrationTest {

    private static final String VERTEILT = "spieler-test"; // app.auth.player-password im Testprofil
    private static final String SUPERADMIN_PASSWORT = TestAccounts.PASSWORD;

    @Autowired private MockMvc mockMvc;
    @Autowired private PlayerRepository playerRepository;
    @MockitoSpyBean private AppUserRepository appUserRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PlayerService playerService;
    @Autowired private UserAccountService userAccountService;
    @Autowired private AccountSelfService accountSelfService;
    @Autowired private DataImportService dataImportService;
    @Autowired private JdbcTemplate jdbc;

    private final List<Long> angelegteSpieler = new ArrayList<>();
    private Set<Long> accountsVorher;

    @BeforeEach
    void vorbereiten() {
        // Die Tests laufen mit create-drop-Schema ohne Flyway: Index und Fremdschluessel aus V70 fehlen dort
        // und werden nachgebaut, sonst pruefte der Test weder den Indexfehler noch die Kaskade.
        jdbc.execute("create unique index if not exists uq_app_user_username on app_user (lower(username))");
        jdbc.execute("""
                do $$ begin
                  if not exists (select 1 from pg_constraint where conname = 'fk_app_user_player') then
                    alter table app_user add constraint fk_app_user_player
                      foreign key (player_id) references players (id) on delete cascade;
                  end if;
                end $$
                """);
        accountsVorher = new HashSet<>();
        appUserRepository.findAll().forEach(a -> accountsVorher.add(a.getId()));
    }

    /** Raeumt auf, was der Test angelegt hat: 16 Testdateien leeren die Spielertabelle, Reste brechen fremde Tests. */
    @AfterEach
    void aufraeumen() {
        appUserRepository.findAll().stream()
                .filter(a -> !accountsVorher.contains(a.getId()))
                .forEach(a -> appUserRepository.deleteById(a.getId()));
        angelegteSpieler.stream().filter(playerRepository::existsById).forEach(playerRepository::deleteById);
        angelegteSpieler.clear();
        // hung ist nach jedem Test so, wie TestAccounts ihn anlegt
        final AppUser hung = hung();
        appUserRepository.updateLocked(hung.getId(), false);
        appUserRepository.updateRole(hung.getId(), Role.SUPERADMIN);
    }

    // ---------- Hilfen ----------

    private Player spieler(final String name) {
        final Player p = playerRepository.save(new Player(name));
        angelegteSpieler.add(p.getId());
        return p;
    }

    private AppUser konto(final String name, final Role role) {
        final Player p = spieler(name);
        final AppUser a = new AppUser();
        a.setPlayerId(p.getId());
        a.setUsername(name.toLowerCase());
        a.setPasswordHash(passwordEncoder.encode("pw-" + name.toLowerCase()));
        a.setRole(role);
        a.setCreatedAt(Instant.now());
        return appUserRepository.save(a);
    }

    private AppUser hung() {
        return appUserRepository.findByUsername(TestAccounts.SUPERADMIN).orElseThrow();
    }

    private AppUser frisch(final Long id) {
        return appUserRepository.findById(id).orElseThrow();
    }

    private static RequestPostProcessor als(final String username, final String rolle) {
        return user(username).roles(rolle);
    }


    // ---------- Anlegen ----------

    @Test
    void legtEinenAccountFuerEinenSpielerAn() throws Exception {
        final Player p = spieler("Anna");

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":" + p.getId() + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("anna"))
                .andExpect(jsonPath("$.role").value("PLAYER"))
                .andExpect(jsonPath("$.passwordChanged").value(false))
                .andExpect(jsonPath("$.playerName").value("Anna"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        final AppUser angelegt = appUserRepository.findByPlayerId(p.getId()).orElseThrow();
        assertThat(passwordEncoder.matches(VERTEILT, angelegt.getPasswordHash())).isTrue();
        assertThat(passwordEncoder.matches(SUPERADMIN_PASSWORT, angelegt.getPasswordHash())).isFalse();
    }

    @Test
    void zeigtAlleAccountsOhneHash() throws Exception {
        konto("Liste", Role.PLAYER);

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username=='liste')]").exists())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void lehntEinenDoppeltenBenutzernamenAb() throws Exception {
        konto("Doppelt", Role.PLAYER);
        final Player zweiter = spieler("Doppelt");

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":" + zweiter.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Der Benutzername 'doppelt' ist schon vergeben."));
    }

    @Test
    void lehntDenDoppeltenNamenAuchBeiAndererGrossschreibungAb() throws Exception {
        final Player gross = spieler("HUNG"); // 'hung' gibt es schon (Superadmin)

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":" + gross.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Der Benutzername 'hung' ist schon vergeben."));
    }

    @Test
    void uebersetztDenIndexfehlerInDieselbeMeldung() throws Exception {
        konto("Kollision", Role.PLAYER);
        final Player zweiter = spieler("KOLLISION");
        // Zwei gleichzeitige Anleger: beide bestehen die Vorabpruefung, nur einer den Index.
        doReturn(Optional.empty()).when(appUserRepository).findByUsername("kollision");

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":" + zweiter.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Der Benutzername 'kollision' ist schon vergeben."));
    }

    @Test
    void legtKeinenZweitenAccountFuerDenselbenSpielerAn() throws Exception {
        final Player p = spieler("Einmal");
        final String body = "{\"playerId\":" + p.getId() + "}";
        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Spieler 'Einmal' hat schon einen Account."));
        assertThat(appUserRepository.findAll()).filteredOn(a -> p.getId().equals(a.getPlayerId())).hasSize(1);
    }

    @Test
    void uebersetztDenIndexfehlerDesSpielersInEineMeldung() throws Exception {
        final Player p = spieler("Gleichzeitig");
        // Der erste Anleger war schneller, unter einem anderen Namen: nur der Spieler-Index schlaegt zu.
        final AppUser erster = new AppUser();
        erster.setPlayerId(p.getId());
        erster.setUsername("abweichend");
        erster.setPasswordHash("{noop}x");
        erster.setRole(Role.PLAYER);
        erster.setCreatedAt(Instant.now());
        appUserRepository.save(erster);
        doReturn(Optional.empty()).when(appUserRepository).findByPlayerId(p.getId());

        mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":" + p.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Dieser Spieler hat schon einen Account."));
    }

    // ---------- Massenanlage ----------

    @Test
    void massenanlageUeberspringtArchivierteUndMeldetDas() throws Exception {
        spieler("Aktiv");
        final Player weg = spieler("Ausgeschieden");
        weg.setArchived(true);
        playerRepository.save(weg);

        mockMvc.perform(post("/api/users/bulk-create"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created[?(@.username=='aktiv')]").exists())
                .andExpect(jsonPath("$.skipped[?(@.playerName=='Ausgeschieden')].reason").value("archiviert"));

        assertThat(appUserRepository.findByPlayerId(weg.getId())).isEmpty();
    }

    @Test
    void massenanlageUeberspringtKollidierendeNamenStattSieZuErfinden() throws Exception {
        konto("Konflikt", Role.PLAYER);
        final Player zweiter = spieler("KONFLIKT");

        mockMvc.perform(post("/api/users/bulk-create"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skipped[?(@.playerName=='KONFLIKT')].reason")
                        .value("Der Benutzername 'konflikt' ist schon vergeben."));

        assertThat(appUserRepository.findByPlayerId(zweiter.getId())).isEmpty();
        assertThat(appUserRepository.findAll()).extracting(AppUser::getUsername)
                .noneMatch(n -> n.matches("konflikt\\d+"));
    }

    // ---------- Passwort-Reset ----------

    @Test
    void setztDasPasswortAufDasVerteilteZurueck() throws Exception {
        final AppUser a = konto("Vergesslich", Role.PLAYER);
        appUserRepository.updatePassword(a.getId(), passwordEncoder.encode("selbst-gewaehlt"), true);

        mockMvc.perform(put("/api/users/" + a.getId() + "/password-reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordChanged").value(false));

        final AppUser danach = frisch(a.getId());
        assertThat(passwordEncoder.matches(VERTEILT, danach.getPasswordHash())).isTrue();
        assertThat(passwordEncoder.matches(SUPERADMIN_PASSWORT, danach.getPasswordHash())).isFalse(); // nicht APP_AUTH_PASSWORD
        assertThat(danach.isPasswordChanged()).isFalse();
    }

    @Test
    void dasVerteiltePasswortDarfNichtDasDesSuperadminsSein() {
        assertThatThrownBy(() -> new VerteiltesPasswort(passwordEncoder, "gleich", "gleich"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new VerteiltesPasswort(passwordEncoder, " ", "anders"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ---------- Rollen und Aussperrschutz ----------

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDarfKeineRolleVergeben() throws Exception {
        final AppUser a = konto("Aufsteiger", Role.PLAYER);

        mockMvc.perform(put("/api/users/" + a.getId() + "/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        assertThat(frisch(a.getId()).getRole()).isEqualTo(Role.PLAYER);
    }

    @Test
    void superadminVergibtEineRolle() throws Exception {
        final AppUser a = konto("Befoerdert", Role.PLAYER);

        mockMvc.perform(put("/api/users/" + a.getId() + "/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void derLetzteSuperadminKannSichNichtDegradieren() throws Exception {
        mockMvc.perform(put("/api/users/" + hung().getId() + "/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());

        assertThat(hung().getRole()).isEqualTo(Role.SUPERADMIN);
    }

    @Test
    void auchEinAndererAufrufKannDenLetztenSuperadminNichtDegradierenOderLoeschen() {
        final AppUser fremderAufrufer = new AppUser();
        fremderAufrufer.setId(-1L);
        fremderAufrufer.setRole(Role.SUPERADMIN);
        fremderAufrufer.setUsername("fremd");
        final Long hungId = hung().getId();

        assertThatThrownBy(() -> userAccountService.setRole(hungId, Role.ADMIN, fremderAufrufer))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("letzte Superadmin");
        assertThatThrownBy(() -> userAccountService.delete(hungId, fremderAufrufer))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("letzte Superadmin");
        assertThatThrownBy(() -> userAccountService.setLocked(hungId, true, fremderAufrufer))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("nie gesperrt");
        assertThat(hung().getRole()).isEqualTo(Role.SUPERADMIN);
    }

    @Test
    void derLetzteSuperadminKannSichNichtLoeschen() throws Exception {
        mockMvc.perform(delete("/api/users/" + hung().getId()))
                .andExpect(status().isBadRequest());

        assertThat(appUserRepository.findByUsername(TestAccounts.SUPERADMIN)).isPresent();
    }

    @Test
    void einSuperadminKannSichAuchMitZweitemSuperadminNichtSelbstDegradieren() throws Exception {
        konto("Zweiter", Role.SUPERADMIN);

        mockMvc.perform(put("/api/users/" + hung().getId() + "/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/users/" + hung().getId()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/users/" + hung().getId() + "/locked").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"locked\":true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void einAdminDarfKeinenSuperadminAnfassen() throws Exception {
        final AppUser admin = konto("Verwalter", Role.ADMIN);
        final String hash = hung().getPasswordHash();
        final String hungId = String.valueOf(hung().getId());

        mockMvc.perform(put("/api/users/" + hungId + "/password-reset").with(als("verwalter", "ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/users/" + hungId + "/locked").with(als("verwalter", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/users/" + hungId + "/may-score").with(als("verwalter", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mayScore\":true}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/users/" + hungId).with(als("verwalter", "ADMIN")))
                .andExpect(status().isForbidden());

        assertThat(hung().getPasswordHash()).isEqualTo(hash);
        assertThat(hung().isLocked()).isFalse();
        assertThat(frisch(admin.getId()).getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void einAdminVerwaltetSpielerAccounts() throws Exception {
        konto("Verwalter2", Role.ADMIN);
        final AppUser spieler = konto("Verwaltet", Role.PLAYER);

        mockMvc.perform(put("/api/users/" + spieler.getId() + "/locked").with(als("verwalter2", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/users/" + spieler.getId() + "/may-score").with(als("verwalter2", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mayScore\":true}"))
                .andExpect(status().isOk());

        assertThat(frisch(spieler.getId()).isLocked()).isTrue();
        assertThat(frisch(spieler.getId()).isMayScore()).isTrue();
    }

    @Test
    void niemandSperrtOderLoeschtSichSelbst() throws Exception {
        final AppUser admin = konto("Selbst", Role.ADMIN);

        mockMvc.perform(put("/api/users/" + admin.getId() + "/locked").with(als("selbst", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/users/" + admin.getId()).with(als("selbst", "ADMIN")))
                .andExpect(status().isBadRequest());
        assertThat(frisch(admin.getId()).isLocked()).isFalse();
    }

    @Test
    void einSpielerDarfDieVerwaltungNichtBenutzen() throws Exception {
        konto("Neugierig", Role.PLAYER);

        mockMvc.perform(get("/api/users").with(als("neugierig", "PLAYER"))).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/users/bulk-create").with(als("neugierig", "PLAYER"))).andExpect(status().isForbidden());
    }

    // ---------- Superadmin: nie gesperrt, nie selbst ernannt ----------

    private AppUser aufrufer(final Role rolle) {
        final AppUser a = new AppUser();
        a.setId(-1L);
        a.setRole(rolle);
        a.setUsername("fremd");
        return a;
    }

    @Test
    void einSuperadminKannEinenZweitenSuperadminNichtSperren() throws Exception {
        final AppUser zweiter = konto("Zweiter4", Role.SUPERADMIN);

        mockMvc.perform(put("/api/users/" + zweiter.getId() + "/locked").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"locked\":true}"))
                .andExpect(status().isBadRequest());
        assertThatThrownBy(() -> userAccountService.setLocked(zweiter.getId(), true, aufrufer(Role.SUPERADMIN)))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("nie gesperrt");

        assertThat(frisch(zweiter.getId()).isLocked()).isFalse();
    }

    @Test
    void einSuperadminKannDenZweitenSuperadminErstNachDemHerabstufenSperren() {
        final AppUser zweiter = konto("Zweiter5", Role.SUPERADMIN);

        userAccountService.setRole(zweiter.getId(), Role.ADMIN, hung());
        userAccountService.setLocked(zweiter.getId(), true, hung());

        assertThat(frisch(zweiter.getId()).isLocked()).isTrue();
    }

    @Test
    void einSuperadminKannDenSpielerEinesZweitenSuperadminsNichtArchivieren() throws Exception {
        final AppUser zweiter = konto("Zweiter6", Role.SUPERADMIN);

        assertThatThrownBy(() -> playerService.setArchived(zweiter.getPlayerId(), true, hung()))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("nie gesperrt");
        mockMvc.perform(put("/api/players/" + zweiter.getPlayerId() + "/archive"))
                .andExpect(status().isBadRequest());

        assertThat(frisch(zweiter.getId()).isLocked()).isFalse();
        assertThat(playerRepository.findById(zweiter.getPlayerId()).orElseThrow().isArchived()).isFalse();
    }

    /** Altbestand aus der Zeit vor der Regel: Superadmin, Spieler archiviert, Account gesperrt. */
    private AppUser gesperrterArchivierterSuperadmin(final String name) {
        final AppUser a = konto(name, Role.SUPERADMIN);
        final Player p = playerRepository.findById(a.getPlayerId()).orElseThrow();
        p.setArchived(true);
        playerRepository.save(p);
        appUserRepository.updateLocked(a.getId(), true);
        return a;
    }

    @Test
    void ueberDenSpielerReaktivierenEntsperrtEinenGesperrtenSuperadminAltbestand() {
        final AppUser zweiter = gesperrterArchivierterSuperadmin("Zweiter7");

        playerService.setArchived(zweiter.getPlayerId(), false, hung());

        assertThat(frisch(zweiter.getId()).isLocked()).isFalse();
        assertThat(playerRepository.findById(zweiter.getPlayerId()).orElseThrow().isArchived()).isFalse();
    }

    @Test
    void einGesperrterSuperadminAltbestandLaesstSichDirektEntsperren() {
        final AppUser zweiter = konto("Zweiter8", Role.SUPERADMIN);
        appUserRepository.updateLocked(zweiter.getId(), true);

        userAccountService.setLocked(zweiter.getId(), false, hung());

        assertThat(frisch(zweiter.getId()).isLocked()).isFalse();
    }

    @Test
    void einGesperrterAccountKannNichtZumSuperadminBefoerdertWerden() throws Exception {
        final AppUser gesperrt = konto("Gesperrt1", Role.ADMIN);
        appUserRepository.updateLocked(gesperrt.getId(), true);

        mockMvc.perform(put("/api/users/" + gesperrt.getId() + "/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPERADMIN\"}"))
                .andExpect(status().isBadRequest());
        assertThatThrownBy(() -> userAccountService.setRole(gesperrt.getId(), Role.SUPERADMIN, hung()))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("Entsperre");

        assertThat(frisch(gesperrt.getId()).getRole()).isEqualTo(Role.ADMIN);
        assertThat(frisch(gesperrt.getId()).isLocked()).isTrue();
    }

    @Test
    void einArchivierterSpielerKannNichtZumSuperadminBefoerdertWerden() {
        final AppUser a = konto("Ausgeschieden", Role.PLAYER);
        playerService.setArchived(a.getPlayerId(), true, hung());

        assertThatThrownBy(() -> userAccountService.setRole(a.getId(), Role.SUPERADMIN, hung()))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("Entsperre");
    }

    @Test
    void einEntsperrterAccountLaesstSichZumSuperadminBefoerdern() {
        final AppUser a = konto("Aufsteiger2", Role.ADMIN);

        userAccountService.setRole(a.getId(), Role.SUPERADMIN, hung());

        assertThat(frisch(a.getId()).getRole()).isEqualTo(Role.SUPERADMIN);
    }

    @Test
    void einAdminBekommtBeimSelbstHochstufenZu403() throws Exception {
        final AppUser admin = konto("Ehrgeizig", Role.ADMIN);

        mockMvc.perform(put("/api/users/" + admin.getId() + "/role").with(als("ehrgeizig", "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SUPERADMIN\"}"))
                .andExpect(status().isForbidden());

        assertThat(frisch(admin.getId()).getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void einSpielerBekommtBeimSelbstHochstufenZu403() throws Exception {
        final AppUser spieler = konto("Neugierig2", Role.PLAYER);

        mockMvc.perform(put("/api/users/" + spieler.getId() + "/role").with(als("neugierig2", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SUPERADMIN\"}"))
                .andExpect(status().isForbidden());

        assertThat(frisch(spieler.getId()).getRole()).isEqualTo(Role.PLAYER);
    }

    // ---------- Spieler archivieren, reaktivieren, loeschen ----------

    @Test
    void spielerArchivierenSperrtDenAccount() {
        final AppUser a = konto("Archivierbar", Role.PLAYER);

        playerService.setArchived(a.getPlayerId(), true, hung());

        assertThat(frisch(a.getId()).isLocked()).isTrue();
    }

    @Test
    void spielerReaktivierenEntsperrtDenAccount() {
        final AppUser a = konto("Zurueck", Role.PLAYER);
        playerService.setArchived(a.getPlayerId(), true, hung());

        playerService.setArchived(a.getPlayerId(), false, hung());

        assertThat(frisch(a.getId()).isLocked()).isFalse();
    }

    @Test
    void reaktivierenEinesAktivenSpielersEntsperrtEinenAbsichtlichGesperrtenAccountNicht() {
        final AppUser a = konto("Absichtlich", Role.PLAYER);
        appUserRepository.updateLocked(a.getId(), true);

        playerService.setArchived(a.getPlayerId(), false, hung()); // Spieler war gar nicht archiviert

        assertThat(frisch(a.getId()).isLocked()).isTrue();
    }

    @Test
    void spielerLoeschenLoeschtDenAccountMit() {
        final AppUser a = konto("Loeschbar", Role.PLAYER);

        playerService.delete(a.getPlayerId(), hung());

        assertThat(appUserRepository.findById(a.getId())).isEmpty();
    }

    @Test
    void spielerLoeschenLehntDenLetztenSuperadminAb() {
        final Long playerId = hung().getPlayerId();

        assertThatThrownBy(() -> playerService.delete(playerId, hung()))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("letzte Superadmin");

        assertThat(playerRepository.existsById(playerId)).isTrue();
        assertThat(appUserRepository.findByUsername(TestAccounts.SUPERADMIN)).isPresent();
    }

    @Test
    void spielerArchivierenLehntDenLetztenSuperadminAb() {
        final Long playerId = hung().getPlayerId();

        assertThatThrownBy(() -> playerService.setArchived(playerId, true, hung()))
                .isInstanceOf(BusinessValidationException.class).hasMessageContaining("nie gesperrt");

        assertThat(playerRepository.findById(playerId).orElseThrow().isArchived()).isFalse();
        assertThat(hung().isLocked()).isFalse();
    }

    @Test
    void einSuperadminDarfDenSpielerEinesZweitenSuperadminsLoeschen() {
        final AppUser zweiter = konto("Zweiter2", Role.SUPERADMIN); // hung bleibt ungesperrt uebrig

        playerService.delete(zweiter.getPlayerId(), hung());

        assertThat(appUserRepository.findById(zweiter.getId())).isEmpty();
        assertThat(appUserRepository.findByUsername(TestAccounts.SUPERADMIN)).isPresent();
    }

    @Test
    void einAdminDarfUeberDenSpielerKeinenSuperadminLoeschenArchivierenOderReaktivieren() throws Exception {
        konto("Verwalter3", Role.ADMIN);
        final AppUser zweiter = konto("Zweiter3", Role.SUPERADMIN); // nicht der letzte: der Guard allein liesse es durch
        final String id = String.valueOf(zweiter.getPlayerId());

        mockMvc.perform(delete("/api/players/" + id).with(als("verwalter3", "ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/players/" + id + "/archive").with(als("verwalter3", "ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/players/" + id + "/unarchive").with(als("verwalter3", "ADMIN")))
                .andExpect(status().isForbidden());

        assertThat(appUserRepository.findById(zweiter.getId())).isPresent();
        assertThat(frisch(zweiter.getId()).isLocked()).isFalse();
        assertThat(playerRepository.findById(zweiter.getPlayerId()).orElseThrow().isArchived()).isFalse();
    }

    @Test
    void einAdminDarfSpielerArchivierenUndLoeschenDieKeinenSuperadminTragen() throws Exception {
        konto("Verwalter4", Role.ADMIN);
        final AppUser spieler = konto("Gewoehnlich", Role.PLAYER);
        final AppUser kollege = konto("Kollege", Role.ADMIN);

        mockMvc.perform(put("/api/players/" + spieler.getPlayerId() + "/archive").with(als("verwalter4", "ADMIN")))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/players/" + kollege.getPlayerId()).with(als("verwalter4", "ADMIN")))
                .andExpect(status().isNoContent());

        assertThat(frisch(spieler.getId()).isLocked()).isTrue();
        assertThat(appUserRepository.findById(kollege.getId())).isEmpty();
    }

    @Test
    void derDatenImportLoeschtWederSpielerNochAccounts() {
        final long spielerVorher = playerRepository.findAll().size();
        final long accountsVorherAnzahl = appUserRepository.count();

        dataImportService.importAll(new DataExport(
                List.of(new DataExport.PlayerExport(1L, "Importiert", null)), List.of()));

        try {
            assertThat(playerRepository.findAll()).hasSize((int) spielerVorher + 1);
            assertThat(appUserRepository.count()).isEqualTo(accountsVorherAnzahl);
            assertThat(appUserRepository.findByUsername(TestAccounts.SUPERADMIN)).isPresent();
        } finally {
            playerRepository.findAll().stream().filter(p -> "Importiert".equals(p.getName()))
                    .forEach(p -> playerRepository.deleteById(p.getId()));
        }
    }

    // ---------- Eigener Account ----------

    @Test
    void nutzerAendertSeinenEigenenBenutzernamen() throws Exception {
        konto("Wechsler", Role.PLAYER);

        mockMvc.perform(put("/api/me/username").with(als("wechsler", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"  Neuer Name \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("neuer name"));

        assertThat(appUserRepository.findByUsername("neuer name")).isPresent();
        assertThat(appUserRepository.findByUsername("wechsler")).isEmpty();
    }

    @Test
    void nutzerKannNichtDenBenutzernamenEinesAnderenAendern() throws Exception {
        final AppUser opfer = konto("Opfer", Role.PLAYER);
        konto("Angreifer", Role.PLAYER);

        // Es gibt keinen Weg, einen fremden Namen zu setzen: /me ist immer der eigene, /users bleibt zu.
        mockMvc.perform(put("/api/users/" + opfer.getId() + "/locked").with(als("angreifer", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/me/username").with(als("angreifer", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"Opfer\"}"))
                .andExpect(status().isBadRequest());

        assertThat(frisch(opfer.getId()).getUsername()).isEqualTo("opfer");
        assertThat(frisch(opfer.getId()).isLocked()).isFalse();
    }

    @Test
    void nutzerMussBeimUmbenennenSeinenEigenenNamenInAndererSchreibweiseBehaltenDuerfen() throws Exception {
        konto("Schreibweise", Role.PLAYER);

        mockMvc.perform(put("/api/me/username").with(als("schreibweise", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"SCHREIBWEISE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("schreibweise"));
    }

    @Test
    void benutzernameOhneDoppelpunktUndNichtLeer() throws Exception {
        konto("Streng", Role.PLAYER);

        for (final String schlecht : new String[]{"   ", "a:b"}) {
            mockMvc.perform(put("/api/me/username").with(als("streng", "PLAYER"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"" + schlecht + "\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void nutzerAendertSeinPasswort() throws Exception {
        final AppUser a = konto("Pwwechsler", Role.PLAYER);

        mockMvc.perform(put("/api/me/password").with(als("pwwechsler", "PLAYER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"pw-pwwechsler\",\"newPassword\":\"ein-neues-passwort\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordChanged").value(true));

        assertThat(passwordEncoder.matches("ein-neues-passwort", frisch(a.getId()).getPasswordHash())).isTrue();
    }

    @Test
    void passwortAenderungVerlangtDasAktuelleUndLehntDasVerteilteAb() throws Exception {
        final AppUser a = konto("Pwstreng", Role.PLAYER);
        final String hash = a.getPasswordHash();

        mockMvc.perform(put("/api/me/password").with(als("pwstreng", "PLAYER")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"falsch\",\"newPassword\":\"ein-neues-passwort\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/me/password").with(als("pwstreng", "PLAYER")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"pw-pwstreng\",\"newPassword\":\"" + VERTEILT + "\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/me/password").with(als("pwstreng", "PLAYER")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"pw-pwstreng\",\"newPassword\":\"kurz\"}"))
                .andExpect(status().isBadRequest());

        assertThat(frisch(a.getId()).getPasswordHash()).isEqualTo(hash);
    }

    // ---------- Gleichzeitige Aenderungen ----------

    /** Beim ersten Lesen des Accounts trifft gleichzeitig eine andere Aenderung ein; der Leser behaelt den alten Stand. */
    private void beimErstenLesenGleichzeitig(final Long id, final Runnable andereAenderung) {
        final AtomicBoolean schonPassiert = new AtomicBoolean(false);
        doAnswer(invocation -> {
            final Object alterStand = invocation.callRealMethod();
            if (schonPassiert.compareAndSet(false, true)) {
                andereAenderung.run();
            }
            return alterStand;
        }).when(appUserRepository).findById(id);
    }

    @Test
    void nutzerAendertPasswortWaehrendEinAdminSperrt_BeidesUeberlebt() {
        final AppUser a = konto("Gleichzeitig1", Role.PLAYER);
        beimErstenLesenGleichzeitig(a.getId(), () -> appUserRepository.updateLocked(a.getId(), true));

        accountSelfService.changePassword(a.getId(), "pw-gleichzeitig1", "ein-neues-passwort");

        final AppUser danach = frisch(a.getId());
        assertThat(danach.isLocked()).as("die Sperre des Admins").isTrue();
        assertThat(passwordEncoder.matches("ein-neues-passwort", danach.getPasswordHash())).as("das neue Passwort").isTrue();
        assertThat(danach.isPasswordChanged()).isTrue();
    }

    @Test
    void adminSperrtWaehrendNutzerSeinPasswortAendert_BeidesUeberlebt() {
        final AppUser a = konto("Gleichzeitig2", Role.PLAYER);
        final AppUser admin = hung();
        final String neuerHash = passwordEncoder.encode("ein-neues-passwort");
        beimErstenLesenGleichzeitig(a.getId(), () -> appUserRepository.updatePassword(a.getId(), neuerHash, true));

        userAccountService.setLocked(a.getId(), true, admin);

        final AppUser danach = frisch(a.getId());
        assertThat(danach.isLocked()).as("die Sperre des Admins").isTrue();
        assertThat(danach.getPasswordHash()).as("das neue Passwort des Nutzers").isEqualTo(neuerHash);
        assertThat(danach.isPasswordChanged()).isTrue();
    }

    @Test
    void adminSetztZurueckWaehrendNutzerUmbenennt_BeidesUeberlebt() {
        final AppUser a = konto("Gleichzeitig3", Role.PLAYER);
        beimErstenLesenGleichzeitig(a.getId(), () -> appUserRepository.updateUsername(a.getId(), "umbenannt"));

        userAccountService.resetPassword(a.getId(), hung());

        final AppUser danach = frisch(a.getId());
        assertThat(danach.getUsername()).as("der neue Name des Nutzers").isEqualTo("umbenannt");
        assertThat(passwordEncoder.matches(VERTEILT, danach.getPasswordHash())).as("das Zuruecksetzen").isTrue();
    }

    @Test
    void nutzerBenenntUmWaehrendAdminRolleUndScorerRechtSetzt_BeidesUeberlebt() {
        final AppUser a = konto("Gleichzeitig4", Role.PLAYER);
        beimErstenLesenGleichzeitig(a.getId(), () -> {
            appUserRepository.updateRole(a.getId(), Role.ADMIN);
            appUserRepository.updateMayScore(a.getId(), true);
        });

        accountSelfService.changeUsername(a.getId(), "Neu4");

        final AppUser danach = frisch(a.getId());
        assertThat(danach.getUsername()).isEqualTo("neu4");
        assertThat(danach.getRole()).isEqualTo(Role.ADMIN);
        assertThat(danach.isMayScore()).isTrue();
    }

    @Test
    void saveSchreibtKeinenBestehendenAccountMehr() {
        final AppUser vorhanden = hung();

        assertThatThrownBy(() -> appUserRepository.save(vorhanden)).isInstanceOf(IllegalArgumentException.class);
    }
}
