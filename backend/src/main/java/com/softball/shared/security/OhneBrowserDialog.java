package com.softball.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.application.AuditService;
import com.softball.domain.model.AuditKind;
import com.softball.domain.port.out.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * Antwortet auf eine abgelehnte Anmeldung mit 401 <em>ohne</em> {@code WWW-Authenticate} — und
 * schreibt den Fehlversuch in die Historie.
 * <p>
 * <b>Kein Browserdialog.</b> Der Vorgabe-Einstiegspunkt von HTTP Basic schickt
 * {@code WWW-Authenticate: Basic realm="Realm"}. Browser beantworten diesen Kopf mit ihrem eigenen
 * Systemfenster — quer über unserem Anmeldeformular. Wer sich vertippt, sieht dann nicht „Passwort
 * stimmt nicht", sondern einen nackten Browserdialog, und was er dort eintippt, erfährt die App
 * nie: die Anmeldung bleibt hängen, die Seite friert ein. Ohne den Kopf bleibt HTTP Basic
 * vollständig funktionsfähig — unser Frontend schickt die Anmeldedaten ohnehin von sich aus mit.
 * Der einzige öffentliche Weg, {@code /api/calendar.ics}, läuft über {@code permitAll()} und kommt
 * hier nie an.
 * <p>
 * <b>Fehlversuche.</b> Gezählt wird nur der Handschlag {@code POST /api/auth/login} und nur, wenn
 * überhaupt Anmeldedaten mitkamen. Beides mit Absicht: jeder abgelaufene Browser-Zugang erzeugt
 * sonst bei jedem Seitenaufbau eine Zeile, und direkt nach einem Deploy kämen alle gespeicherten
 * Zugangsdaten auf einmal — Lärm statt Hinweis. Gezählt wird, wo jemand ein Passwort <em>getippt</em>
 * hat. Das Passwort selbst wird nie gelesen, nie geloggt und nie gespeichert.
 * <p>
 * Der Benutzername kommt aus einer nicht angemeldeten Anfrage und ist damit Fremdeingabe: er wird
 * gekürzt und von Steuerzeichen befreit, bevor er in die Historie geht.
 */
@Component
public class OhneBrowserDialog implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(OhneBrowserDialog.class);
    private static final String HANDSCHLAG = "/api/auth/login";
    private static final int MAX_NAME = 60;

    private final ObjectMapper objectMapper;
    private final AuditService audit;
    private final AppUserRepository appUserRepository;

    public OhneBrowserDialog(final ObjectMapper objectMapper, final AuditService audit,
                             final AppUserRepository appUserRepository) {
        this.objectMapper = objectMapper;
        this.audit = audit;
        this.appUserRepository = appUserRepository;
    }

    @Override
    public void commence(final HttpServletRequest request, final HttpServletResponse response,
                         final AuthenticationException authException) throws IOException {
        vermerkeFehlversuch(request, authException);

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), Map.of(
            "error", "Benutzername oder Passwort stimmt nicht.",
            "timestamp", Instant.now().toString()
        ));
    }

    /** Ein Fehler hier darf die 401-Antwort nicht kippen — der Nutzer wartet auf sie. */
    private void vermerkeFehlversuch(final HttpServletRequest request, final AuthenticationException grund) {
        if (!"POST".equals(request.getMethod()) || !HANDSCHLAG.equals(request.getRequestURI())) {
            return;
        }
        final String benutzername = benutzernameAus(request.getHeader(HttpHeaders.AUTHORIZATION));
        if (benutzername == null) {
            return;
        }
        try {
            audit.record(benutzername, AuditKind.LOGIN_FAILED, "POST", HANDSCHLAG, label(benutzername, grund),
                    null, null, HttpServletResponse.SC_UNAUTHORIZED);
        } catch (final RuntimeException e) {
            log.warn("Historie: gescheiterte Anmeldung konnte nicht geschrieben werden", e);
        }
    }

    /**
     * Spring versteckt {@code UsernameNotFoundException} hinter {@code BadCredentialsException}, damit
     * die <em>Antwort</em> nicht verrät, welche Namen es gibt. In der Historie darf der Unterschied
     * stehen — sie sieht nur der Superadmin, und „jemand rät Namen" ist etwas anderes als „jemand rät
     * Passwörter". Eine Sperre meldet Spring dagegen als eigene Ausnahme.
     */
    private String label(final String benutzername, final AuthenticationException grund) {
        if (grund instanceof LockedException || grund instanceof DisabledException) {
            return "Gesperrter Account";
        }
        return appUserRepository.findByUsername(benutzername).isPresent()
                ? "Falsches Passwort"
                : "Unbekannter Benutzername";
    }

    /** {@code null}, wenn kein brauchbarer Basic-Kopf mitkam — dann hat niemand etwas getippt. */
    private String benutzernameAus(final String kopf) {
        if (kopf == null || !kopf.regionMatches(true, 0, "Basic ", 0, 6)) {
            return null;
        }
        final String entschluesselt;
        try {
            entschluesselt = new String(Base64.getDecoder().decode(kopf.substring(6).trim()), StandardCharsets.UTF_8);
        } catch (final IllegalArgumentException e) {
            return null;
        }
        final int doppelpunkt = entschluesselt.indexOf(':');
        final String roh = doppelpunkt < 0 ? entschluesselt : entschluesselt.substring(0, doppelpunkt);
        final String sauber = roh.codePoints()
                .filter(c -> !Character.isISOControl(c))
                .limit(MAX_NAME)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
                .toString()
                .trim();
        return sauber.isEmpty() ? null : sauber;
    }
}
