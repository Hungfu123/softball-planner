package com.softball.controller;

import com.softball.dto.CreateGameDayRequest;
import com.softball.dto.GameDayPlayerStats;
import com.softball.dto.GameDayResponse;
import com.softball.dto.SetAvailablePlayersRequest;
import com.softball.dto.UpdateGameDayRequest;
import com.softball.service.GameDayService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class GameDayController {

    private final GameDayService gameDayService;

    public GameDayController(final GameDayService gameDayService) {
        this.gameDayService = gameDayService;
    }

    @GetMapping("/seasons/{seasonId}/gamedays")
    public List<GameDayResponse> getBySeasonId(@PathVariable final Long seasonId) {
        return gameDayService.findBySeasonIdAsDto(seasonId);
    }

    @PostMapping("/seasons/{seasonId}/gamedays")
    @ResponseStatus(HttpStatus.CREATED)
    public GameDayResponse create(@PathVariable final Long seasonId,
                                  @Valid @RequestBody final CreateGameDayRequest request) {
        return gameDayService.create(seasonId, request.date(), request.label(), request.location());
    }

    @GetMapping("/gamedays/{id}")
    public GameDayResponse getById(@PathVariable final Long id) {
        return gameDayService.findByIdAsDto(id);
    }

    @PutMapping("/gamedays/{id}")
    public GameDayResponse update(@PathVariable final Long id,
                                  @RequestBody final UpdateGameDayRequest request) {
        return gameDayService.update(id, request.date(), request.label(), request.location());
    }

    @PutMapping("/gamedays/{id}/players")
    public GameDayResponse setAvailablePlayers(@PathVariable final Long id,
                                               @Valid @RequestBody final SetAvailablePlayersRequest request) {
        return gameDayService.setAvailablePlayers(id, request.playerIds());
    }

    @GetMapping("/gamedays/{id}/stats")
    public List<GameDayPlayerStats> getStats(@PathVariable final Long id) {
        return gameDayService.getStats(id);
    }

    @DeleteMapping("/gamedays/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        gameDayService.delete(id);
    }
}
