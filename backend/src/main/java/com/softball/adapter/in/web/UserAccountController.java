package com.softball.adapter.in.web;

import com.softball.adapter.dto.BulkCreateResponse;
import com.softball.adapter.dto.CreateUserRequest;
import com.softball.adapter.dto.SetLockedRequest;
import com.softball.adapter.dto.SetMayScoreRequest;
import com.softball.adapter.dto.SetRoleRequest;
import com.softball.adapter.dto.UserAccountResponse;
import com.softball.application.UserAccountService;
import com.softball.shared.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Accounts verwalten. Kein Endpunkt nimmt ein Passwort entgegen: es kommt aus der Konfiguration. */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/users")
public class UserAccountController {

    private final UserAccountService service;
    private final CurrentUser currentUser;

    public UserAccountController(final UserAccountService service, final CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<UserAccountResponse> getAll() {
        return service.findAll().stream().map(UserAccountResponse::von).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserAccountResponse create(@Valid @RequestBody final CreateUserRequest request) {
        return UserAccountResponse.von(service.create(request.playerId()));
    }

    @PostMapping("/bulk-create")
    public BulkCreateResponse bulkCreate() {
        return BulkCreateResponse.von(service.createForAll());
    }

    @PutMapping("/{id}/password-reset")
    public UserAccountResponse resetPassword(@PathVariable final Long id) {
        return UserAccountResponse.von(service.resetPassword(id, currentUser.get()));
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PutMapping("/{id}/role")
    public UserAccountResponse setRole(@PathVariable final Long id, @Valid @RequestBody final SetRoleRequest request) {
        return UserAccountResponse.von(service.setRole(id, request.role(), currentUser.get()));
    }

    @PutMapping("/{id}/may-score")
    public UserAccountResponse setMayScore(@PathVariable final Long id,
                                           @Valid @RequestBody final SetMayScoreRequest request) {
        return UserAccountResponse.von(service.setMayScore(id, request.mayScore(), currentUser.get()));
    }

    @PutMapping("/{id}/locked")
    public UserAccountResponse setLocked(@PathVariable final Long id,
                                         @Valid @RequestBody final SetLockedRequest request) {
        return UserAccountResponse.von(service.setLocked(id, request.locked(), currentUser.get()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        service.delete(id, currentUser.get());
    }
}
