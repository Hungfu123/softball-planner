package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.GameService;
import com.softball.application.GameStaffService;
import com.softball.application.LineupService;
import com.softball.application.LineupSuggestionService;
import com.softball.application.SubstitutionService;
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
    private final SubstitutionService substitutionService;

    public GameController(final GameService gameService, final LineupService lineupService,
                          final GameStaffService gameStaffService,
                          final LineupSuggestionService lineupSuggestionService,
                          final SubstitutionService substitutionService) {
        this.gameService = gameService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
        this.substitutionService = substitutionService;
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

    @GetMapping("/{id}/substitutions")
    public List<SubstitutionResponse> getSubstitutions(@PathVariable final Long id) {
        return substitutionService.getSubstitutions(id).stream().map(SubstitutionResponse::from).toList();
    }

    @PutMapping("/{id}/substitutions")
    public List<SubstitutionResponse> setSubstitutions(@PathVariable final Long id,
                                                        @RequestBody List<@Valid SubstitutionRequest> requests) {
        return substitutionService.setSubstitutions(id, requests).stream().map(SubstitutionResponse::from).toList();
    }
}
