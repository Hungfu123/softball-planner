package com.softball.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;

/**
 * Antwortet auf eine abgelehnte Anmeldung mit 401 <em>ohne</em> {@code WWW-Authenticate}.
 * <p>
 * Der Vorgabe-Einstiegspunkt von HTTP Basic schickt {@code WWW-Authenticate: Basic realm="Realm"}.
 * Browser beantworten diesen Kopf mit ihrem eigenen Systemfenster — quer über unser Anmeldeformular.
 * Wer sich vertippt, sieht dann nicht „Passwort stimmt nicht", sondern einen nackten Browserdialog,
 * und was er dort eintippt, erfährt die App nie: die Anmeldung bleibt hängen, die Seite friert ein.
 * <p>
 * Ohne den Kopf bleibt HTTP Basic vollständig funktionsfähig — unser Frontend schickt die
 * Anmeldedaten ohnehin von sich aus mit, es hat die Aufforderung nie gebraucht. Der einzige
 * öffentliche Weg, {@code /api/calendar.ics}, läuft über {@code permitAll()} und kommt hier nie an.
 * <p>
 * Der Körper hat dieselbe Form wie der des {@code GlobalExceptionHandler} ({@code error},
 * {@code timestamp}), damit das Frontend 401 nicht gesondert behandeln muss.
 */
@Component
public class OhneBrowserDialog implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public OhneBrowserDialog(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(final HttpServletRequest request, final HttpServletResponse response,
                         final AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), Map.of(
            "error", "Benutzername oder Passwort stimmt nicht.",
            "timestamp", Instant.now().toString()
        ));
    }
}
