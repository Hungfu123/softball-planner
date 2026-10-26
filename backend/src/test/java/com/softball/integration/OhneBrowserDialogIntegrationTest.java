package com.softball.integration;

import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Eine abgelehnte Anmeldung darf kein {@code WWW-Authenticate} tragen: Browser beantworten
 * den Kopf mit ihrem eigenen Systemfenster, das quer über unserem Anmeldeformular liegt und
 * dessen Eingaben die App nie erfährt. Dieser Test ist die einzige Stelle, die das festhält —
 * {@code httpBasic(Customizer.withDefaults())} schickt den Kopf sonst wieder mit.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class OhneBrowserDialogIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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
}
