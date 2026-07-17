package com.softball.adapter.in.web;

import com.softball.adapter.dto.CreatePlayerRequest;
import com.softball.adapter.dto.PlayerResponse;
import com.softball.adapter.dto.SetWhatsappNameRequest;
import com.softball.adapter.dto.UpdatePlayerRequest;
import com.softball.application.PlayerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(final PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping
    public List<PlayerResponse> getAll() {
        return playerService.findAll().stream().map(PlayerResponse::from).toList();
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
