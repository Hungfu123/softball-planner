package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.InvitationRequest;
import com.softball.adapter.dto.InvitationResponse;
import com.softball.application.InvitationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private final InvitationService service;

    public InvitationController(final InvitationService service) {
        this.service = service;
    }

    @GetMapping
    public List<InvitationResponse> getAll() {
        return service.findAll().stream().map(InvitationResponse::from).toList();
    }

    @GetMapping("/{id}")
    public InvitationResponse getById(@PathVariable final Long id) {
        return InvitationResponse.from(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse create(@Valid @RequestBody final InvitationRequest request) {
        return InvitationResponse.from(service.create(request.toDomain()));
    }

    @PutMapping("/{id}")
    public InvitationResponse update(@PathVariable final Long id, @Valid @RequestBody final InvitationRequest request) {
        return InvitationResponse.from(service.update(id, request.toDomain()));
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse duplicate(@PathVariable final Long id) {
        return InvitationResponse.from(service.duplicate(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        service.delete(id);
    }
}
