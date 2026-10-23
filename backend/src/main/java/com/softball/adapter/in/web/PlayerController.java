package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.CreatePlayerRequest;
import com.softball.adapter.dto.PlayerFormPointResponse;
import com.softball.adapter.dto.PlayerResponse;
import com.softball.adapter.dto.PlayerUsageResponse;
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

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;
    private final PlayerProfileService playerProfileService;

    public PlayerController(final PlayerService playerService,
                            final PlayerProfileService playerProfileService) {
        this.playerService = playerService;
        this.playerProfileService = playerProfileService;
    }

    @GetMapping
    public List<PlayerResponse> getAll(@RequestParam(name = "includeArchived", required = false, defaultValue = "false") final boolean includeArchived) {
        return playerService.findAll(includeArchived).stream().map(PlayerResponse::from).toList();
    }

    @GetMapping("/{id}")
    public PlayerResponse getOne(@PathVariable final Long id) {
        return PlayerResponse.from(playerService.findById(id));
    }

    /** Form-Kurve des Spielers: ein Punkt je Spiel, ältestes zuerst. */
    @GetMapping("/{id}/batting-timeline")
    public List<PlayerFormPointResponse> getBattingTimeline(@PathVariable final Long id) {
        return playerProfileService.getFormTimeline(id).stream().map(PlayerFormPointResponse::from).toList();
    }

    /** Einsatz-Profil: Zusagen, Aufstellungen, Training-Anwesenheit, Schlagplatz. */
    @GetMapping("/{id}/usage")
    public PlayerUsageResponse getUsage(@PathVariable final Long id,
                                        @RequestParam(name = "year", required = false) final Integer year,
                                        @RequestParam(name = "seasonId", required = false) final Long seasonId) {
        final UsageScope scope = seasonId != null ? UsageScope.ofSeason(seasonId)
            : year != null ? UsageScope.ofYear(year)
            : UsageScope.all();
        return PlayerUsageResponse.from(playerProfileService.getUsage(id, scope));
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
        return PlayerResponse.from(playerService.setArchived(id, true));
    }

    @PutMapping("/{id}/unarchive")
    public PlayerResponse unarchive(@PathVariable final Long id) {
        return PlayerResponse.from(playerService.setArchived(id, false));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        playerService.delete(id);
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
