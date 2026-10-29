package com.softball.adapter.in.web;

import com.softball.adapter.dto.AuditVerlaufResponse;
import com.softball.adapter.dto.LastSeenResponse;
import com.softball.application.AuditService;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditQuery;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** Die Historie sieht nur der Superadmin, auch ein Admin nicht. */
@PreAuthorize("hasRole('SUPERADMIN')")
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService service;

    public AuditController(final AuditService service) {
        this.service = service;
    }

    @GetMapping
    public AuditVerlaufResponse verlauf(
            @RequestParam(required = false) final Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) final Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) final Instant to,
            @RequestParam(required = false) final AuditKind kind) {
        return AuditVerlaufResponse.von(service.verlauf(new AuditQuery(userId, from, to, kind)));
    }

    @GetMapping("/last-seen")
    public List<LastSeenResponse> zuletztGesehen() {
        return service.zuletztGesehen().stream().map(LastSeenResponse::von).toList();
    }
}
