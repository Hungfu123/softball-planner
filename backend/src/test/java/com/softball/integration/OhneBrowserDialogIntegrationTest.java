package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditQuery;
import com.softball.domain.port.out.AuditEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Zwei Zusicherungen von {@code OhneBrowserDialog}.
 * <p>
 * Erstens: eine abgelehnte Anmeldung trägt kein {@code WWW-Authenticate}. Browser beantworten den
 * Kopf mit ihrem eigenen Systemfenster, das quer über unserem Anmeldeformular liegt und dessen
 * Eingaben die App nie erfährt. {@code httpBasic(Customizer.withDefaults())} schickt ihn sonst wieder.
 * <p>
 * Zweitens: Fehlversuche am Handschlag landen in der Historie — und nur die. Jeder abgelaufene
 * Browser-Zugang erzeugt sonst bei jedem Seitenaufbau eine Zeile.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class OhneBrowserDialogIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditEventRepository auditEventRepository;

    private List<AuditEvent> fehlversuche() {
        return auditEventRepository.find(new AuditQuery(null, null, null, AuditKind.LOGIN_FAILED), 100);
    }

    @Test
    void ohneAnmeldedatenKommt401OhneAufforderung() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(jsonPath("$.error").value("Benutzername oder Passwort stimmt nicht."))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    /** Der Weg, den ein Spieler mit vertipptem Passwort nimmt. */
    @Test
    void falschesPasswortAmHandschlagKommt401OhneAufforderung() throws Exception {
        mockMvc.perform(post("/api/auth/login").with(httpBasic("hung", "falsch")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void falschesPasswortEinesBekanntenKontosStehtInDerHistorie() throws Exception {
        final int vorher = fehlversuche().size();

        mockMvc.perform(post("/api/auth/login").with(httpBasic("hung", "ganz-falsch")))
                .andExpect(status().isUnauthorized());

        final List<AuditEvent> jetzt = fehlversuche();
        assertThat(jetzt).hasSize(vorher + 1);
        final AuditEvent e = jetzt.get(0);
        assertThat(e.username()).isEqualTo("hung");
        assertThat(e.label()).isEqualTo("Falsches Passwort");
        assertThat(e.path()).isEqualTo("/api/auth/login");
    }

    /** „Jemand rät Namen" ist etwas anderes als „jemand rät Passwörter" — der Unterschied darf hier stehen. */
    @Test
    void unbekannterNameWirdAlsSolcherVermerkt() throws Exception {
        mockMvc.perform(post("/api/auth/login").with(httpBasic("gibtesnicht", "egal")))
                .andExpect(status().isUnauthorized());

        assertThat(fehlversuche().get(0).label()).isEqualTo("Unbekannter Benutzername");
    }

    /** Ein abgelaufener Browser-Zugang ist kein Anmeldeversuch: er tippt niemand. */
    @Test
    void abgelehnteAnfrageAusserhalbDesHandschlagsSchreibtNichts() throws Exception {
        final int vorher = fehlversuche().size();

        mockMvc.perform(get("/api/me").with(httpBasic("hung", "falsch")))
                .andExpect(status().isUnauthorized());

        assertThat(fehlversuche()).hasSize(vorher);
    }

    @Test
    void handschlagGanzOhneAnmeldedatenSchreibtNichts() throws Exception {
        final int vorher = fehlversuche().size();

        mockMvc.perform(post("/api/auth/login"))
                .andExpect(status().isUnauthorized());

        assertThat(fehlversuche()).hasSize(vorher);
    }
}
