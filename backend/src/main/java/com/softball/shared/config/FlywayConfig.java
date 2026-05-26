package com.softball.shared.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Flyway-Repair-on-Startup: failed Migration-Entries werden vor jedem Migrate-Lauf
 * geloescht. Verhindert, dass eine einmalig fehlgeschlagene Migration den
 * Backend-Start auf Prod blockiert — Fix-Commit kann ohne manuellen DB-Eingriff
 * durchlaufen.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairAndMigrate() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
