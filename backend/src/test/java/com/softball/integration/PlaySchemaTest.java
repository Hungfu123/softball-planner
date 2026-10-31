package com.softball.integration;

import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prueft das Schema aus V66 und V67 gegen eine echte PostgreSQL.
 *
 * Das Testprofil schaltet Flyway ab und laesst Hibernate das Schema bauen — fuer einen
 * Migrationstest waere das wertlos. Diese Klasse dreht beides um: Flyway baut, Hibernate
 * validiert nur. Damit laeuft der Test gegen genau das Schema, das in Produktion entsteht,
 * und faellt auch dann, wenn eine Entity und ihre Migration auseinanderlaufen.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class PlaySchemaTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void legtDieNeunStartkategorienAn() {
        Integer anzahl = jdbc.queryForObject("SELECT count(*) FROM play_category", Integer.class);
        // Neun seit V80: das Outfield hat eine eigene bekommen. Die Antworten darauf, wohin
        // ein Outfielder wirft, lagen vorher in drei Kategorien verteilt, von denen keine
        // nach ihm hiess.
        assertThat(anzahl).isEqualTo(9);

        // Seit V76 stehen die Kategorien vom Einfachen zum Schweren: wer die Seite zum
        // Lernen aufmacht, faengt oben an. Vorher stand Cut-off & Relay zuerst — die
        // schwierigste Sache im ganzen Katalog.
        String erste = jdbc.queryForObject(
                "SELECT name FROM play_category ORDER BY sort_order LIMIT 1", String.class);
        assertThat(erste).isEqualTo("Spielsituationen");

        // Und hinten steht seit V81 die Bunt-Defense. Einschaetzung des Trainers, der die
        // Mannschaft trainiert: Rundown ist nicht schwer, ein Bunt zu verteidigen schon.
        String letzte = jdbc.queryForObject(
                "SELECT name FROM play_category ORDER BY sort_order DESC LIMIT 1", String.class);
        assertThat(letzte).isEqualTo("Bunt-Defense");
    }

    @Test
    void lehntDenselbenNamenInAndererSchreibweiseAb() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO play_category (name, sort_order) VALUES ('CUT-OFF & RELAY', 99)"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void erlaubtDreiOutsAberKeineVier() {
        Long categoryId = jdbc.queryForObject(
                "SELECT id FROM play_category ORDER BY sort_order LIMIT 1", Long.class);
        jdbc.update("INSERT INTO play (id, title, category_id) VALUES (9001, 'Testplay', ?)", categoryId);

        jdbc.update("""
                INSERT INTO play_step (play_id, ordinal, duration_ms, outs, markers)
                VALUES (9001, 1, 1200, 3, '{}'::jsonb)
                """);

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO play_step (play_id, ordinal, duration_ms, outs, markers)
                VALUES (9001, 2, 1200, 4, '{}'::jsonb)
                """)).isInstanceOf(DataIntegrityViolationException.class);

        jdbc.update("DELETE FROM play WHERE id = 9001");
    }

    @Test
    void loeschtStaendeMitDemPlayUndSetztDasGegenstueckAufNull() {
        Long categoryId = jdbc.queryForObject(
                "SELECT id FROM play_category ORDER BY sort_order LIMIT 1", Long.class);
        jdbc.update("INSERT INTO play (id, title, category_id) VALUES (9101, 'A', ?)", categoryId);
        jdbc.update("INSERT INTO play (id, title, category_id, counterpart_play_id) VALUES (9102, 'B', ?, 9101)",
                categoryId);
        jdbc.update("""
                INSERT INTO play_step (play_id, ordinal, duration_ms, outs, markers)
                VALUES (9101, 1, 1200, 0, '{}'::jsonb)
                """);

        jdbc.update("DELETE FROM play WHERE id = 9101");

        Integer staende = jdbc.queryForObject(
                "SELECT count(*) FROM play_step WHERE play_id = 9101", Integer.class);
        assertThat(staende).isZero();

        Long gegenstueck = jdbc.queryForObject(
                "SELECT counterpart_play_id FROM play WHERE id = 9102", Long.class);
        assertThat(gegenstueck).isNull();

        jdbc.update("DELETE FROM play WHERE id = 9102");
    }

    @Test
    void verbietetDasLoeschenEinerBelegtenKategorie() {
        Long categoryId = jdbc.queryForObject(
                "SELECT id FROM play_category ORDER BY sort_order LIMIT 1", Long.class);
        jdbc.update("INSERT INTO play (id, title, category_id) VALUES (9201, 'C', ?)", categoryId);

        assertThatThrownBy(() -> jdbc.update("DELETE FROM play_category WHERE id = ?", categoryId))
                .isInstanceOf(DataIntegrityViolationException.class);

        jdbc.update("DELETE FROM play WHERE id = 9201");
    }
}
