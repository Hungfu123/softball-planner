package com.softball.adapter.in.web;

import com.softball.shared.security.CurrentUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.CreatePlayerRequest;
import com.softball.adapter.dto.PlayerFormPointResponse;
import com.softball.adapter.dto.PlayerResponse;
import com.softball.adapter.dto.PlayerUsageResponse;
import com.softball.adapter.dto.TrainingAnwesenheitResponse;
import com.softball.adapter.dto.SetWhatsappNameRequest;
import com.softball.adapter.dto.UpdateGenderRequest;
import com.softball.adapter.dto.UpdatePlayerRequest;
import com.softball.adapter.dto.UpdatePositionProfileRequest;
import com.softball.application.PlayerProfileService;
import com.softball.domain.model.UsageScope;
import com.softball.application.PlayerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;
    private final PlayerProfileService playerProfileService;
    private final CurrentUser currentUser;

    public PlayerController(final PlayerService playerService,
                            final PlayerProfileService playerProfileService,
                            final CurrentUser currentUser) {
        this.playerService = playerService;
        this.playerProfileService = playerProfileService;
        this.currentUser = currentUser;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<PlayerResponse> getAll(@RequestParam(name = "includeArchived", required = false, defaultValue = "false") final boolean includeArchived) {
        return playerService.findAll(includeArchived).stream().map(PlayerResponse::from).toList();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public PlayerResponse getOne(@PathVariable final Long id) {
        return PlayerResponse.from(playerService.findById(id));
    }

    /** Form-Kurve des Spielers: ein Punkt je Spiel, ältestes zuerst. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/batting-timeline")
    public List<PlayerFormPointResponse> getBattingTimeline(@PathVariable final Long id) {
        return playerProfileService.getFormTimeline(id).stream().map(PlayerFormPointResponse::from).toList();
    }

    /** Einsatz-Profil: Zusagen, Aufstellungen, Training-Anwesenheit, Schlagplatz. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/usage")
    public PlayerUsageResponse getUsage(@PathVariable final Long id,
                                        @RequestParam(name = "year", required = false) final Integer year,
                                        @RequestParam(name = "seasonId", required = false) final Long seasonId) {
        final UsageScope scope = seasonId != null ? UsageScope.ofSeason(seasonId)
            : year != null ? UsageScope.ofYear(year)
            : UsageScope.all();
        return PlayerUsageResponse.from(playerProfileService.getUsage(id, scope),
            currentUser.darfTrainingszahlenSehenVon(id));
    }

    /**
     * Wie oft dieser Spieler in jedem Monat eines Jahres im Training war — Monat (1..12) auf Anzahl.
     *
     * Eigene Zahlen oder Trainer; sonst 403. Ein leerer Monat fehlt in der Karte, statt mit einer
     * Null dazustehen: „nicht da" und „kein Training angesetzt" sind verschiedene Aussagen, und
     * welche davon gilt, weiss der Terminplan, nicht diese Antwort.
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/training-months")
    public TrainingAnwesenheitResponse getTrainingMonths(@PathVariable final Long id,
                                                         @RequestParam(name = "year") final int year) {
        if (!currentUser.darfTrainingszahlenSehenVon(id)) {
            throw new AccessDeniedException("Trainingszahlen anderer Spieler");
        }
        return TrainingAnwesenheitResponse.from(playerProfileService.getTrainingMonths(id, year));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerResponse create(@Valid @RequestBody final CreatePlayerRequest request) {
        return PlayerResponse.from(playerService.create(request.name()));
    }

    @PutMapping("/{id}")
    public PlayerResponse update(@PathVariable final Long id, @Valid @RequestBody final UpdatePlayerRequest request) {
        return PlayerResponse.from(playerService.update(id, request.name(), request.regular()));
    }

    @PutMapping("/{id}/gender")
    public PlayerResponse updateGender(@PathVariable final Long id,
                                       @RequestBody final UpdateGenderRequest request) {
        return PlayerResponse.from(playerService.updateGender(id, request.gender()));
    }

    @PutMapping("/{id}/positions")
    public PlayerResponse updatePositions(@PathVariable final Long id,
                                          @RequestBody final UpdatePositionProfileRequest request) {
        return PlayerResponse.from(playerService.updatePositionProfile(
            id, request.primary(), request.secondary(), request.tertiary()));
    }

    @PutMapping("/{id}/archive")
    public PlayerResponse archive(@PathVariable final Long id) {
        return PlayerResponse.from(playerService.setArchived(id, true, currentUser.get()));
    }

    @PutMapping("/{id}/unarchive")
    public PlayerResponse unarchive(@PathVariable final Long id) {
        return PlayerResponse.from(playerService.setArchived(id, false, currentUser.get()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        playerService.delete(id, currentUser.get());
    }

    @PutMapping("/{id}/whatsapp-name")
    public PlayerResponse setWhatsappName(@PathVariable final Long id,
                                          @RequestBody final SetWhatsappNameRequest request) {
        return PlayerResponse.from(playerService.setWhatsappName(id, request.whatsappName()));
    }

    @PutMapping("/batting-order")
    public List<PlayerResponse> updateBattingOrder(@RequestBody final List<Long> orderedPlayerIds) {
        return playerService.updateBattingOrder(orderedPlayerIds).stream()
            .map(PlayerResponse::from).toList();
    }
}
