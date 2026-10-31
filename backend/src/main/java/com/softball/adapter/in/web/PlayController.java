package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.PlayRequest;
import com.softball.adapter.dto.PlayResponse;
import com.softball.application.PlayService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/plays")
public class PlayController {

    private final PlayService playService;

    public PlayController(final PlayService playService) {
        this.playService = playService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<PlayResponse> getAll(@RequestParam(required = false) final Long categoryId) {
        return playService.findAll(categoryId).stream().map(PlayResponse::from).toList();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public PlayResponse getById(@PathVariable final Long id) {
        return PlayResponse.from(playService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayResponse create(@Valid @RequestBody final PlayRequest request) {
        return PlayResponse.from(playService.create(request));
    }

    @PutMapping("/{id}")
    public PlayResponse update(@PathVariable final Long id, @Valid @RequestBody final PlayRequest request) {
        return PlayResponse.from(playService.update(id, request));
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public PlayResponse duplicate(@PathVariable final Long id) {
        return PlayResponse.from(playService.duplicate(id));
    }

    /**
     * Loeschen darf nur der Superadmin.
     *
     * Ein Play ist Lernstoff, kein Arbeitsstand: die einundfuenfzig Start-Plays kommen aus
     * einer Migration, und ein versehentlich geloeschtes ist nur ueber eine neue Migration
     * wieder da. Trainer bauen und aendern, weggeraeumt wird eine Stufe hoeher.
     *
     * **Nicht nur in der Oberflaeche:** dort verschwindet der Papierkorb zwar, aber ein
     * ausgeblendeter Knopf ist kein Verbot — die Regel steht hier.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        playService.delete(id);
    }
}
