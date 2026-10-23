package com.softball.integration;

import com.softball.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Sichert die Annahme, auf der die Rechtepruefung steht: die RoleHierarchy-Bean greift bei
 * {@code @PreAuthorize}. Ein eigener MethodSecurityExpressionHandler wuerde sie stumm aushebeln.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import({TestcontainersConfig.class, RoleHierarchyIntegrationTest.Konfiguration.class})
class RoleHierarchyIntegrationTest {

    public static class NurAdmin {
        @PreAuthorize("hasRole('ADMIN')")
        public void tun() {
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Konfiguration {
        @Bean
        NurAdmin nurAdmin() {
            return new NurAdmin();
        }
    }

    @Autowired
    private NurAdmin nurAdmin;

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void superadminDarfEineAdminMethodeAufrufen() {
        assertThatCode(nurAdmin::tun).doesNotThrowAnyException();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDarfEineAdminMethodeAufrufen() {
        assertThatCode(nurAdmin::tun).doesNotThrowAnyException();
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void playerDarfEineAdminMethodeNichtAufrufen() {
        assertThatThrownBy(nurAdmin::tun).isInstanceOf(AccessDeniedException.class);
    }
}
