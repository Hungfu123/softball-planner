package com.softball;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Eine Uhr, die ein Integrationstest auf einen Zeitpunkt festsetzen kann — und die sonst die
 * echte Zeit liefert, damit alles andere im Kontext weiterlaeuft wie gewohnt. Ersetzt per
 * {@code @Primary} die Uhr aus {@code TimeConfig}; wer sie benutzt, ruft in {@code @AfterEach}
 * {@link #freigeben()}, denn der Kontext (und damit die Uhr) wird zwischen Tests geteilt.
 */
public class SetzbareUhr extends Clock {

    private volatile Instant fest;

    public void setzeAuf(final String utc) {
        fest = Instant.parse(utc);
    }

    public void freigeben() {
        fest = null;
    }

    @Override
    public Instant instant() {
        final Instant festgesetzt = fest;
        return festgesetzt != null ? festgesetzt : Instant.now();
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(final ZoneId zone) {
        return Clock.fixed(instant(), zone);
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Konfiguration {

        @Bean
        @Primary
        public SetzbareUhr setzbareUhr() {
            return new SetzbareUhr();
        }
    }
}
