package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ruft den Bootstrap NICHT selbst auf: prueft, dass er beim Kontextstart auf frischer
 * Datenbank feuert. Der eigene Bootstrap-Spielername erzwingt einen neuen Kontext und damit
 * einen frischen Container, die Vorbedingung schafft sich der Test also nicht selbst.
 * Flyway laeuft hier echt und Hibernate validiert, damit V70 gegen die Entity geprueft ist
 * (die uebrigen Tests bauen das Schema per create-drop).
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@TestPropertySource(properties = {
        "app.auth.bootstrap-player=Wiring",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class AccountBootstrapWiringTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Test
    void kontextStartLegtDenSuperadminAn() {
        assertThat(appUserRepository.findAll()).hasSize(1);
        final AppUser user = appUserRepository.findByUsername("wiring").orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.SUPERADMIN);
        assertThat(user.getPlayerId()).isNotNull();
    }
}
