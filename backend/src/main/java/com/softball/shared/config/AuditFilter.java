package com.softball.shared.config;

import com.softball.application.AuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Schreibt in die Historie, was ein Angemeldeter erfolgreich geaendert hat: POST, PUT, PATCH und
 * DELETE unter {@code /api/**}, und nur bei 2xx. Ein fehlgeschlagener Aufruf hat nichts
 * geaendert. Laeuft nach der Security-Kette, der Nutzer ist also schon bekannt. Ein Fehler beim
 * Schreiben der Historie darf die eigentliche Antwort nicht kippen.
 */
@Component
public class AuditFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuditFilter.class);

    private final AuditService audit;

    public AuditFilter(final AuditService audit) {
        this.audit = audit;
    }

    @Override
    protected boolean shouldNotFilter(final HttpServletRequest request) {
        return !AuditLabels.schreibend(request.getMethod()) || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(final HttpServletRequest request, final HttpServletResponse response,
                                    final FilterChain chain) throws ServletException, IOException {
        chain.doFilter(request, response);
        final int status = response.getStatus();
        if (status >= 200 && status < 300) {
            schreibe(request, status);
        }
    }

    private void schreibe(final HttpServletRequest request, final int status) {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return;
        }
        final String method = request.getMethod();
        final String path = request.getRequestURI();
        if (AuditLabels.ohneEintrag(method, path)) {
            return;
        }
        try {
            final AuditLabels.Eintrag e = AuditLabels.zuordnen(method, path);
            audit.record(auth.getName(), e.kind(), method, path, e.label(), e.targetType(), e.targetId(), status);
        } catch (final RuntimeException ex) {
            log.warn("Historie: {} {} konnte nicht geschrieben werden", method, path, ex);
        }
    }
}
