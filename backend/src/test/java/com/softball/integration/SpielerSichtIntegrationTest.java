package com.softball.integration;

import com.softball.MitSuperadmin;
import com.softball.TestcontainersConfig;
import com.softball.shared.security.SpielerSichtFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Die Spielersicht des Superadmins. Geprueft wird vor allem, was sie NICHT kann.
 *
 * <p>Der Kopf darf Rechte ausschliesslich wegnehmen. Waere das Gegenteil moeglich, haette
 * jeder Spieler mit der Entwicklerkonsole die Verwaltung — deshalb sind die Tests, die das
 * ausschliessen, die wichtigeren.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@MitSuperadmin
class SpielerSichtIntegrationTest {

    // "hung" ist der Account, den @MitSuperadmin wirklich anlegt — /api/me schlaegt ihn nach.
    private static final RequestPostProcessor SUPERADMIN = user("hung").roles("SUPERADMIN");
    private static final RequestPostProcessor ADMIN = user("trainer").roles("ADMIN");
    private static final RequestPostProcessor SPIELER = user("spieler").roles("PLAYER");

    /**
     * Ein Weg, den nur Trainer gehen duerfen — Lackmustest fuer die Rechte.
     * Ausdruecklich NICHT {@code /api/players}: das steht auf {@code isAuthenticated()} und
     * antwortet auch einem Spieler mit 200, taugt also nicht zum Messen.
     */
    private static final String NUR_FUER_TRAINER = "/api/users";

    @Autowired private MockMvc mockMvc;

    @Test
    void ohneKopfBleibtDerSuperadminSuperadmin() throws Exception {
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN))
            .andExpect(status().isOk());
    }

    @Test
    void mitKopfSiehtDerSuperadminDieWeltAlsSpieler() throws Exception {
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN).header(SpielerSichtFilter.KOPF, "PLAYER"))
            .andExpect(status().isForbidden());
    }

    @Test
    void derKopfWirktNurFuerDieseEineAnfrage() throws Exception {
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN).header(SpielerSichtFilter.KOPF, "PLAYER"))
            .andExpect(status().isForbidden());
        // Nichts wurde gespeichert: die naechste Anfrage ohne Kopf ist wieder die volle.
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN))
            .andExpect(status().isOk());
    }

    @Test
    void einAdminDarfDenKopfNichtBenutzen() throws Exception {
        // Schaden koennte er keinen anrichten (es geht nur abwaerts), aber der Betreiber
        // wollte den Schalter ausdruecklich nur fuer sich.
        mockMvc.perform(get(NUR_FUER_TRAINER).with(ADMIN).header(SpielerSichtFilter.KOPF, "PLAYER"))
            .andExpect(status().isOk());
    }

    @Test
    void einSpielerKannSichDamitNichtHochstufen() throws Exception {
        // Der Kern der Zusage: der Kopf gibt niemandem etwas.
        for (final String versuch : new String[] {"ADMIN", "SUPERADMIN", "admin", "superadmin"}) {
            mockMvc.perform(get(NUR_FUER_TRAINER).with(SPIELER).header(SpielerSichtFilter.KOPF, versuch))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void einSuperadminKannSichDamitNichtsGebenWasErHat() throws Exception {
        // Auch ein Wunsch nach oben aendert nichts — er ist ohnehin schon oben, und der
        // Filter kennt nur PLAYER als Wunsch.
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN).header(SpielerSichtFilter.KOPF, "SUPERADMIN"))
            .andExpect(status().isOk());
    }

    @Test
    void unsinnImKopfAendertNichts() throws Exception {
        for (final String unsinn : new String[] {"", "  ", "ROLE_PLAYER", "PLAYER,ADMIN", "nope"}) {
            mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN).header(SpielerSichtFilter.KOPF, unsinn))
                .andExpect(status().isOk());
        }
    }

    @Test
    void grossKleinSchreibungIstEgal() throws Exception {
        mockMvc.perform(get(NUR_FUER_TRAINER).with(SUPERADMIN).header(SpielerSichtFilter.KOPF, "player"))
            .andExpect(status().isForbidden());
    }

    @Test
    void dieEigeneAuskunftBleibtErreichbar() throws Exception {
        // Sonst saehe die Oberflaeche im Spielermodus nicht mehr, wer sie eigentlich ist —
        // und kaeme nicht zurueck.
        mockMvc.perform(get("/api/me").with(SUPERADMIN).header(SpielerSichtFilter.KOPF, "PLAYER"))
            .andExpect(status().isOk());
    }
}
