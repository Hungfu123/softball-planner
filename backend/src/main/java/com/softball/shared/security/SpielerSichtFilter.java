package com.softball.shared.security;

import com.softball.domain.model.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * Laesst einen Superadmin die App sehen, wie ein Spieler sie sieht — fuers Testen, ohne sich
 * ab- und mit einem zweiten Konto wieder anzumelden.
 *
 * <p><b>Warum im Backend und nicht nur in der Oberflaeche:</b> die Lesegrenze der Aufstellung
 * sitzt hier ({@link AufstellungSichtbarkeit}), nicht im Frontend. Ein Schalter, der nur die
 * Oberflaeche umstellt, zeigte die Spielerkarten mit den Daten eines Trainers — ein gesperrter
 * Spieltag waere voll statt leer. Der Test loege genau dort, wo man hinsieht.
 *
 * <p><b>Warum das sicher ist:</b> die Regel ist {@code effektiv = min(echt, gewuenscht)}. Der
 * Kopf kann Rechte nur WEGNEHMEN, nie geben. Selbst wenn ein Spieler ihn von Hand mitschickt,
 * nimmt er sich bloss selbst etwas. Zusaetzlich wird er nur von einem Konto angenommen, dessen
 * ECHTE Rolle {@code SUPERADMIN} ist — der Betreiber wollte das ausdruecklich nur fuer sich.
 *
 * <p><b>An der Rolle des Kontos aendert sich nichts.</b> {@code app_user.role} wird nicht
 * angefasst; der Modus lebt im Browser und haengt je Anfrage an diesem Kopf. Abmelden, anderes
 * Geraet, Neustart — ueberall ist er wieder Superadmin. Es gibt nichts, was "haengenbleiben"
 * koennte, und niemand kann sich damit aussperren: der Rueckweg ist, den Kopf wegzulassen.
 *
 * <p>Ersetzt wird nur die Berechtigungsliste, nicht der Name: die Historie
 * ({@code AuditFilter}) schreibt weiter den echten Benutzernamen.
 *
 * <p>Greift, weil ALLES, was ueber Rechte entscheidet, diese {@code Authentication} liest —
 * {@code @PreAuthorize}, {@link AufstellungSichtbarkeit#darfSehen}, {@link ScoringPermission}
 * und {@code CurrentUser.darfTrainingszahlenSehen}. Wer eine weitere Entscheidung einbaut,
 * nimmt den SecurityContext, nicht die Rolle aus der Datenbank — sonst faellt sie hier heraus.
 */
@Component
public class SpielerSichtFilter extends OncePerRequestFilter {

    /** Der Kopf, mit dem die Oberflaeche um die kleinere Sicht bittet. */
    public static final String KOPF = "X-Rolle-Ansicht";

    private static final String SUPERADMIN = "ROLE_" + "SUPERADMIN";
    private static final List<GrantedAuthority> NUR_SPIELER =
        List.of(new SimpleGrantedAuthority("ROLE_" + Role.PLAYER.name()));

    /** Was man sich wuenschen darf. Nur abwaerts — darum steht hier genau eine Rolle. */
    private static final Set<String> ERLAUBT = Set.of(Role.PLAYER.name());

    @Override
    protected void doFilterInternal(final HttpServletRequest request, final HttpServletResponse response,
                                    final FilterChain chain) throws ServletException, IOException {
        final Authentication echt = SecurityContextHolder.getContext().getAuthentication();
        if (gewuenscht(request) && istSuperadmin(echt)) {
            SecurityContextHolder.getContext().setAuthentication(herabgestuft(echt));
        }
        chain.doFilter(request, response);
    }

    private static boolean gewuenscht(final HttpServletRequest request) {
        final String wert = request.getHeader(KOPF);
        return wert != null && ERLAUBT.contains(wert.trim().toUpperCase());
    }

    private static boolean istSuperadmin(final Authentication auth) {
        return auth != null
            && auth.isAuthenticated()
            && auth.getAuthorities().stream().anyMatch(a -> SUPERADMIN.equals(a.getAuthority()));
    }

    /** Dieselbe Anmeldung, nur mit kleineren Rechten. Name und Principal bleiben. */
    private static Authentication herabgestuft(final Authentication echt) {
        final AbstractAuthenticationToken kleiner = new AbstractAuthenticationToken(NUR_SPIELER) {
            @Override public Object getCredentials() { return echt.getCredentials(); }
            @Override public Object getPrincipal() { return echt.getPrincipal(); }
            @Override public String getName() { return echt.getName(); }
        };
        kleiner.setAuthenticated(true);
        kleiner.setDetails(echt.getDetails());
        return kleiner;
    }
}
