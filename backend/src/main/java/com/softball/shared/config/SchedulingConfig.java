package com.softball.shared.config;

import com.softball.application.AuditService;
import com.softball.domain.service.PollDueEvaluator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public PollDueEvaluator pollDueEvaluator() {
        return new PollDueEvaluator();
    }

    /**
     * Taeglich: Historie aelter als zwoelf Monate loeschen. Laeuft ausserhalb jeder HTTP-Anfrage,
     * deshalb nur ueber {@link AuditService}, der {@code CurrentUser} nicht kennt.
     */
    @Bean
    public AuditCleanup auditCleanup(final AuditService audit) {
        return new AuditCleanup(audit);
    }

    public static class AuditCleanup {
        private final AuditService audit;

        AuditCleanup(final AuditService audit) {
            this.audit = audit;
        }

        @Scheduled(cron = "0 30 3 * * *", zone = "Europe/Berlin")
        public void raeumeAuf() {
            audit.raeumeAuf();
        }
    }
}
