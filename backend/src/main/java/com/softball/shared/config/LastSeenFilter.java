package com.softball.shared.config;

import com.softball.application.SelbstauskunftService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Schreibt {@code lastSeenAt} bei jedem authentifizierten Aufruf, aber hoechstens alle fuenf
 * Minuten je Nutzer. Laeuft nach der Security-Kette (Standardreihenfolge), der Nutzer ist also
 * schon bekannt. Der Zaehler liegt im Speicher: nach einem Neustart einmal zu oft zu schreiben
 * ist folgenlos.
 */
@Component
public class LastSeenFilter extends OncePerRequestFilter {

    static final Duration MINDESTABSTAND = Duration.ofMinutes(5);

    private final ConcurrentMap<String, Instant> zuletztGeschrieben = new ConcurrentHashMap<>();
    private final Clock clock;
    private final SelbstauskunftService selbstauskunft;

    public LastSeenFilter(final Clock clock, final SelbstauskunftService selbstauskunft) {
        this.clock = clock;
        this.selbstauskunft = selbstauskunft;
    }

    @Override
    protected void doFilterInternal(final HttpServletRequest request, final HttpServletResponse response,
                                    final FilterChain chain) throws ServletException, IOException {
        vermerkeFallsFaellig();
        chain.doFilter(request, response);
    }

    private void vermerkeFallsFaellig() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return;
        }
        final Instant jetzt = Instant.now(clock);
        final boolean[] faellig = {false};
        zuletztGeschrieben.compute(auth.getName(), (name, zuletzt) -> {
            faellig[0] = zuletzt == null || !jetzt.isBefore(zuletzt.plus(MINDESTABSTAND));
            return faellig[0] ? jetzt : zuletzt;
        });
        if (faellig[0]) {
            selbstauskunft.vermerkeGesehen(auth.getName(), jetzt);
        }
    }

    /** Fuer Tests: vergisst, wann zuletzt geschrieben wurde. */
    public void zuruecksetzen() {
        zuletztGeschrieben.clear();
    }
}
