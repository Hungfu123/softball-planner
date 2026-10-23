package com.softball.adapter.in.web;

import com.softball.adapter.dto.MeResponse;
import com.softball.application.SelbstauskunftService;
import com.softball.domain.model.AppUser;
import com.softball.shared.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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

    public MeController(final CurrentUser currentUser, final SelbstauskunftService selbstauskunft) {
        this.currentUser = currentUser;
        this.selbstauskunft = selbstauskunft;
    }

    @GetMapping
    public MeResponse me() {
        final AppUser user = currentUser.get();
        return MeResponse.von(user, selbstauskunft.spielerName(user).orElse(null));
    }
}
