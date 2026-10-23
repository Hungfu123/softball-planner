package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AuditEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Belegt gegen das ECHTE Schema (Flyway V71, Hibernate nur {@code validate}), was {@code validate}
 * nicht sieht: ON DELETE SET NULL auf {@code user_id} und die beiden Indizes. Eigener
 * Bootstrap-Spielername erzwingt einen eigenen Kontext mit frischem Container.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = {
        "app.auth.bootstrap-player=AuditSchema",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class AuditSchemaTest {

    @Autowired private AppUserRepository appUserRepository;
    @Autowired private PlayerRepository playerRepository;
    @Autowired private AuditEventRepository auditEvents;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void aufraeumen() {
        jdbc.update("delete from audit_event where username = 'schema-weg'");
        playerRepository.findAll().stream().filter(p -> "Spieler schema-weg".equals(p.getName()))
                .forEach(p -> playerRepository.deleteById(p.getId()));
    }

    @Test
    void accountLoeschenBehaeltDieZeileUndLeertNurDieUserId() {
        final Player player = playerRepository.save(new Player("Spieler schema-weg"));
        final AppUser user = new AppUser();
        user.setPlayerId(player.getId());
        user.setUsername("schema-weg");
        user.setPasswordHash("{noop}x");
        user.setRole(Role.PLAYER);
        user.setCreatedAt(Instant.now());
        final AppUser konto = appUserRepository.save(user);
        auditEvents.save(new AuditEvent(null, konto.getId(), "schema-weg", AuditKind.WRITE, "PUT", "/x", null, null,
                null, 200, Instant.now()));

        appUserRepository.deleteById(konto.getId());

        final List<Object[]> zeilen = jdbc.query(
                "select user_id, username from audit_event where username = 'schema-weg'",
                (rs, i) -> new Object[]{rs.getObject("user_id"), rs.getString("username")});
        assertThat(zeilen).hasSize(1);
        assertThat(zeilen.get(0)[0]).isNull();
        assertThat(zeilen.get(0)[1]).isEqualTo("schema-weg");
    }

    @Test
    void beideIndizesFuerDieHistorieSindDa() {
        final List<String> indizes = jdbc.queryForList(
                "select indexdef from pg_indexes where tablename = 'audit_event'", String.class);

        assertThat(indizes).anyMatch(d -> d.contains("(occurred_at DESC)"));
        assertThat(indizes).anyMatch(d -> d.contains("(user_id, occurred_at DESC)"));
    }
}
