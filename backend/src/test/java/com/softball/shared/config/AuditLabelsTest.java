package com.softball.shared.config;

import com.softball.domain.model.AuditKind;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditLabelsTest {

    private static AuditLabels.Eintrag zu(final String method, final String path) {
        return AuditLabels.zuordnen(method, path);
    }

    @Test
    void lineupSchreibenIstKlartextMitSpielAlsZiel() {
        final var e = zu("PUT", "/api/games/42/lineup");

        assertThat(e).isEqualTo(new AuditLabels.Eintrag(AuditKind.WRITE, "Lineup geändert", "GAME", 42L));
    }

    @Test
    void scoringPfadeSindScoringMitSpielAlsZiel() {
        assertThat(zu("POST", "/api/games/7/atbats"))
                .isEqualTo(new AuditLabels.Eintrag(AuditKind.SCORING, "At-Bat eingetragen", "GAME", 7L));
        assertThat(zu("POST", "/api/games/7/scoring/next-inning").kind()).isEqualTo(AuditKind.SCORING);
        assertThat(zu("POST", "/api/games/7/clock/start").kind()).isEqualTo(AuditKind.SCORING);
        assertThat(zu("PUT", "/api/games/7/score").kind()).isEqualTo(AuditKind.SCORING);
        assertThat(zu("POST", "/api/games/7/substitutions").kind()).isEqualTo(AuditKind.SCORING);
        assertThat(zu("POST", "/api/spielbogen/5/at-bats"))
                .isEqualTo(new AuditLabels.Eintrag(AuditKind.SCORING, "Spielbogen: At-Bat eingetragen", "SPIELBOGEN", 5L));
        assertThat(zu("POST", "/api/spielbogen/5/stealing-events").kind()).isEqualTo(AuditKind.SCORING);
    }

    @Test
    void nichtScoringPfadeAmSelbenControllerBleibenSchreibvorgang() {
        assertThat(zu("PUT", "/api/games/7/staff").kind()).isEqualTo(AuditKind.WRITE);
        assertThat(zu("PUT", "/api/spielbogen/5/lineup").kind()).isEqualTo(AuditKind.WRITE);
    }

    @Test
    void anmeldungIstLogin() {
        assertThat(zu("POST", "/api/auth/login"))
                .isEqualTo(new AuditLabels.Eintrag(AuditKind.LOGIN, "Angemeldet", null, null));
    }

    @Test
    void dieMethodeEntscheidet() {
        assertThat(zu("DELETE", "/api/players/3").label()).isEqualTo("Spieler gelöscht");
        assertThat(zu("PUT", "/api/players/3/archive").label()).isEqualTo("Spieler archiviert");
        assertThat(zu("PUT", "/api/users/3/role").label()).isEqualTo("Rolle geändert");
        assertThat(zu("PUT", "/api/users/3/role").targetType()).isEqualTo("USER");
    }

    @Test
    void unbekanntesBleibtOhneKlartextAberNichtOhneEintrag() {
        assertThat(zu("POST", "/api/neu/ding")).isEqualTo(new AuditLabels.Eintrag(AuditKind.WRITE, null, null, null));
        // gleicher Pfad, andere Methode als in der Tabelle: unbekannt
        assertThat(zu("GET", "/api/games/42/lineup").label()).isNull();
    }
}
