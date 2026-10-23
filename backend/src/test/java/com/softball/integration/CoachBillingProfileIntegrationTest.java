package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringCoachBillingProfileRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser(roles = "SUPERADMIN")
class CoachBillingProfileIntegrationTest {

    private static final String PROFILE = """
        {
          "firstName": "Hung", "lastName": "Luu",
          "street": "Teststr. 1", "zip": "40221", "city": "Duesseldorf",
          "sportCourse": "Softball/Baseball",
          "hourlyRate": 15.00, "maxHours": 12,
          "recipientName": "Alice",
          "recipientEmail": "alice@example.org",
          "signaturePng": "data:image/png;base64,AAA"
        }
        """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpringCoachBillingProfileRepository repository;

    @BeforeEach
    @AfterEach
    void clean() {
        repository.deleteAll();
    }

    @Test
    void liefertLeerSolangeNichtsEingetragenIst() throws Exception {
        // Die Migration legt keine Daten an — ein unausgefuelltes Profil ist kein Fehler.
        mockMvc.perform(get("/api/coach-billing/profile"))
            .andExpect(status().isNoContent());
    }

    @Test
    void speichertUndLiestDieStammdaten() throws Exception {
        mockMvc.perform(put("/api/coach-billing/profile")
                .contentType(MediaType.APPLICATION_JSON).content(PROFILE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lastName").value("Luu"))
            .andExpect(jsonPath("$.maxHours").value(12));

        mockMvc.perform(get("/api/coach-billing/profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.hourlyRate").value(15.00))
            .andExpect(jsonPath("$.recipientName").value("Alice"))
            .andExpect(jsonPath("$.recipientEmail").value("alice@example.org"))
            .andExpect(jsonPath("$.signaturePng").value("data:image/png;base64,AAA"));
    }

    @Test
    void schreibtImmerDieselbeZeileStattEineZweiteAnzulegen() throws Exception {
        mockMvc.perform(put("/api/coach-billing/profile")
            .contentType(MediaType.APPLICATION_JSON).content(PROFILE)).andExpect(status().isOk());
        mockMvc.perform(put("/api/coach-billing/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PROFILE.replace("\"Hung\"", "\"Hung-Zweit\"")))
            .andExpect(status().isOk());

        assertThat(repository.count()).isEqualTo(1);
        assertThat(repository.findAll().getFirst().getFirstName()).isEqualTo("Hung-Zweit");
    }

    @Test
    void weistEineUnbrauchbareAdresseZurueck() throws Exception {
        mockMvc.perform(put("/api/coach-billing/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PROFILE.replace("alice@example.org", "keine-adresse")))
            .andExpect(status().isBadRequest());
    }
}
