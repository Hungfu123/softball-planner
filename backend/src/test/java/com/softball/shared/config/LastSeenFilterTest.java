package com.softball.shared.config;

import com.softball.application.SelbstauskunftService;
import com.softball.domain.model.AppUser;
import com.softball.shared.security.CurrentUser;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LastSeenFilterTest {

    private Instant jetzt = Instant.parse("2026-10-23T12:00:00Z");
    private final Clock uhr = new Clock() {
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(final java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return jetzt; }
    };
    private final SelbstauskunftService service = mock(SelbstauskunftService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final AppUser hung = new AppUser();
    private LastSeenFilter filter;

    @BeforeEach
    void setUp() {
        hung.setUsername("hung");
        when(currentUser.find()).thenReturn(Optional.of(hung));
        filter = new LastSeenFilter(uhr, currentUser, service);
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("hung", "x", "ROLE_ADMIN"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void aufruf() throws Exception {
        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), mock(FilterChain.class));
    }

    @Test
    void ersterAufrufSchreibtZweiterDirektDanachNicht() throws Exception {
        aufruf();
        aufruf();

        verify(service, times(1)).vermerkeGesehen(hung, jetzt);
    }

    @Test
    void nachFuenfMinutenSchreibtErWieder() throws Exception {
        aufruf();
        jetzt = jetzt.plus(Duration.ofMinutes(4).plusSeconds(59));
        aufruf();
        verify(service, times(1)).vermerkeGesehen(any(), any());

        jetzt = Instant.parse("2026-10-23T12:05:00Z");
        aufruf();
        verify(service, times(2)).vermerkeGesehen(any(), any());
    }

    @Test
    void jederNutzerHatSeinenEigenenZaehler() throws Exception {
        aufruf();
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("anna", "x", "ROLE_PLAYER"));
        aufruf();

        verify(service, times(2)).vermerkeGesehen(any(), any());
    }

    @Test
    void anonymSchreibtNichts() throws Exception {
        SecurityContextHolder.clearContext();
        aufruf();

        verify(service, never()).vermerkeGesehen(any(), any());
    }
}
