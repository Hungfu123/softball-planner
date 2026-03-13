package com.softball.controller;

import com.softball.dto.*;
import com.softball.service.GameService;
import com.softball.service.GameStaffService;
import com.softball.service.LineupService;
import com.softball.service.LineupSuggestionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;
    private final LineupService lineupService;
    private final GameStaffService gameStaffService;
    private final LineupSuggestionService lineupSuggestionService;

    public GameController(final GameService gameService, final LineupService lineupService,
                          final GameStaffService gameStaffService,
                          final LineupSuggestionService lineupSuggestionService) {
        this.gameService = gameService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
    }

    @PutMapping("/{id}/opponent")
    public GameResponse updateOpponent(@PathVariable final Long id, @RequestBody final UpdateGameRequest request) {
        return GameResponse.from(gameService.updateOpponent(id, request.opponentTeamId()));
    }

    @PutMapping("/{id}/score")
    public GameResponse setScore(@PathVariable final Long id, @RequestBody final SetGameScoreRequest request) {
        return GameResponse.from(gameService.setScore(id, request.scoreUs(), request.scoreThem()));
    }

    @GetMapping("/{id}/lineup")
    public List<LineupEntryResponse> getLineup(@PathVariable final Long id) {
        return lineupService.getLineup(id).stream().map(LineupEntryResponse::from).toList();
    }

    @PutMapping("/{id}/lineup")
    public List<LineupEntryResponse> setLineup(@PathVariable final Long id, @RequestBody List<@Valid LineupEntryRequest> entries) {
        return lineupService.setLineup(id, entries).stream().map(LineupEntryResponse::from).toList();
    }

    @GetMapping("/{id}/lineup/suggest")
    public List<LineupSuggestionEntry> suggestLineup(@PathVariable final Long id) {
        return lineupSuggestionService.suggest(id);
    }

    @GetMapping("/{id}/staff")
    public List<GameStaffResponse> getStaff(@PathVariable final Long id) {
        return gameStaffService.getStaff(id).stream().map(GameStaffResponse::from).toList();
    }

    @PutMapping("/{id}/staff")
    public List<GameStaffResponse> setStaff(@PathVariable final Long id, @RequestBody List<@Valid GameStaffRequest> staffRequests) {
        return gameStaffService.setStaff(id, staffRequests).stream().map(GameStaffResponse::from).toList();
    }

    @PostMapping("/{gameId1}/swap/{gameId2}")
    public List<GameResponse> swapGames(@PathVariable final Long gameId1, @PathVariable final Long gameId2) {
        return gameService.swapGames(gameId1, gameId2).stream().map(GameResponse::from).toList();
    }
}
