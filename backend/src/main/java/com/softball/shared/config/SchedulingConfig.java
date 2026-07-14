package com.softball.shared.config;

import com.softball.domain.service.PollDueEvaluator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public PollDueEvaluator pollDueEvaluator() {
        return new PollDueEvaluator();
    }
}
