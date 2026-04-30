package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.GameService;
import com.softball.application.GameStaffService;
import com.softball.application.LineupService;
import com.softball.application.LineupSuggestionService;
import com.softball.application.SubstitutionService;
import com.softball.domain.model.Game;
import com.softball.domain.port.out.AtBatRepository;
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
    private final AtBatRepository atBatRepository;

    public GameController(final GameService gameService, final LineupService lineupService,
                          final GameStaffService gameStaffService,
                          final LineupSuggestionService lineupSuggestionService,
                          final SubstitutionService substitutionService,
                          final AtBatRepository atBatRepository) {
        this.gameService = gameService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
        this.substitutionService = substitutionService;
        this.atBatRepository = atBatRepository;
    }

    private GameResponse toResponseWithLive(final Game game) {
        final long atBatCount = atBatRepository.countByGameId(game.getId());
        final Integer liveScoreUs = atBatCount > 0 ? atBatRepository.sumRunsScoredByGameId(game.getId()) : null;
        return GameResponse.from(game, atBatCount, liveScoreUs);
    }

    @PutMapping("/{id}/opponent")
    public GameResponse updateOpponent(@PathVariable final Long id, @RequestBody final UpdateGameRequest request) {
        return toResponseWithLive(gameService.updateOpponent(id, request.opponentTeamId()));
    }

    @PutMapping("/{id}/score")
    public GameResponse setScore(@PathVariable final Long id, @RequestBody final SetGameScoreRequest request) {
        return toResponseWithLive(gameService.setScore(id, request.scoreUs(), request.scoreThem()));
    }

    @PostMapping("/{id}/end")
    public GameResponse endGame(@PathVariable final Long id) {
        return toResponseWithLive(gameService.endGame(id));
    }

    @PutMapping("/{id}/batting-side")
    public GameResponse setBattingSide(@PathVariable final Long id, @RequestBody @Valid final SetBattingSideRequest request) {
        return toResponseWithLive(gameService.setBattingSide(id, request.battingSide()));
    }

    @PostMapping("/{id}/reopen")
    public GameResponse reopenGame(@PathVariable final Long id) {
        return toResponseWithLive(gameService.reopenGame(id));
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
        return gameService.swapGames(gameId1, gameId2).stream().map(this::toResponseWithLive).toList();
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

    /**
     * Fügt EINE Substitution hinzu (ohne existierende zu löschen).
     * Für Mid-Game-Wechsel im Live-Scoring.
     */
    @PostMapping("/{id}/substitutions")
    public SubstitutionResponse addSubstitution(@PathVariable final Long id,
                                                 @RequestBody @Valid SubstitutionRequest request) {
        return SubstitutionResponse.from(substitutionService.addSubstitution(id, request));
    }
}
