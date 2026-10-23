package com.softball.adapter.in.web;

import com.softball.adapter.dto.ChangePasswordRequest;
import com.softball.adapter.dto.ChangeUsernameRequest;
import com.softball.adapter.dto.MeResponse;
import com.softball.application.AccountSelfService;
import com.softball.application.SelbstauskunftService;
import com.softball.domain.model.AppUser;
import com.softball.shared.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Auskunft ueber den Angemeldeten, bei jedem Seitenaufbau gerufen. Setzt {@code lastLoginAt}
 * bewusst nicht: das gehoert dem Handschlag {@code POST /api/auth/login}.
 */
@PreAuthorize("isAuthenticated()")
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final CurrentUser currentUser;
    private final SelbstauskunftService selbstauskunft;
    private final AccountSelfService selfService;

    public MeController(final CurrentUser currentUser, final SelbstauskunftService selbstauskunft,
                        final AccountSelfService selfService) {
        this.currentUser = currentUser;
        this.selbstauskunft = selbstauskunft;
        this.selfService = selfService;
    }

    @GetMapping
    public MeResponse me() {
        final AppUser user = currentUser.get();
        return MeResponse.von(user, selbstauskunft.spielerName(user).orElse(null));
    }

    /** Nach der Aenderung passen die gespeicherten Basic-Anmeldedaten des Browsers nicht mehr: das Frontend tauscht sie aus. */
    @PutMapping("/username")
    public MeResponse changeUsername(@Valid @RequestBody final ChangeUsernameRequest request) {
        return antwort(selfService.changeUsername(currentUser.get().getId(), request.username()));
    }

    @PutMapping("/password")
    public MeResponse changePassword(@Valid @RequestBody final ChangePasswordRequest request) {
        return antwort(selfService.changePassword(currentUser.get().getId(),
                request.currentPassword(), request.newPassword()));
    }

    private MeResponse antwort(final AppUser user) {
        return MeResponse.von(user, selbstauskunft.spielerName(user).orElse(null));
    }
}
