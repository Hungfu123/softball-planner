package com.softball.adapter.in.web;

import com.softball.adapter.dto.MeResponse;
import com.softball.application.SelbstauskunftService;
import com.softball.domain.model.AppUser;
import com.softball.shared.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;

/**
 * Der Anmelde-Handschlag. HTTP Basic kennt keinen Anmeldevorgang, jeder Aufruf traegt die
 * Zugangsdaten; nur das Absenden des Anmeldeformulars ruft diesen Endpunkt und setzt
 * {@code lastLoginAt}.
 */
@PreAuthorize("isAuthenticated()")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUser currentUser;
    private final SelbstauskunftService selbstauskunft;
    private final Clock clock;

    public AuthController(final CurrentUser currentUser, final SelbstauskunftService selbstauskunft,
                          final Clock clock) {
        this.currentUser = currentUser;
        this.selbstauskunft = selbstauskunft;
        this.clock = clock;
    }

    @PostMapping("/login")
    public MeResponse login() {
        final AppUser user = currentUser.get();
        selbstauskunft.vermerkeAnmeldung(user, Instant.now(clock));
        return MeResponse.von(user, selbstauskunft.spielerName(user).orElse(null));
    }
}
