package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.*;
import com.softball.application.GameScoringService;
import com.softball.application.GameService;
import com.softball.application.GameStaffService;
import com.softball.application.LineupService;
import com.softball.application.LineupSuggestionService;
import com.softball.application.SubstitutionService;
import com.softball.domain.model.Game;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.shared.security.AufstellungSichtbarkeit;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;
    private final LineupService lineupService;
    private final GameStaffService gameStaffService;
    private final LineupSuggestionService lineupSuggestionService;
    private final SubstitutionService substitutionService;
    private final AtBatRepository atBatRepository;
    private final GameScoringService gameScoringService;
    private final AufstellungSichtbarkeit sichtbarkeit;

    public GameController(final GameService gameService, final LineupService lineupService,
                          final GameStaffService gameStaffService,
                          final LineupSuggestionService lineupSuggestionService,
                          final SubstitutionService substitutionService,
                          final AtBatRepository atBatRepository,
                          final GameScoringService gameScoringService,
                          final AufstellungSichtbarkeit sichtbarkeit) {
        this.gameService = gameService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
        this.substitutionService = substitutionService;
        this.atBatRepository = atBatRepository;
        this.gameScoringService = gameScoringService;
        this.sichtbarkeit = sichtbarkeit;
    }

    private GameResponse toResponseWithLive(final Game game) {
        final long atBatCount = atBatRepository.countByGameId(game.getId());
        // liveScoreUs inkl. Steal-Runs (Steal of Home + Kaskade) — sonst weicht die Karte
        // von der Scoring-Page ab.
        final Integer liveScoreUs = atBatCount > 0 ? gameScoringService.computeLiveScoreUs(game.getId()) : null;
        return GameResponse.from(game, atBatCount, liveScoreUs);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public GameResponse getGame(@PathVariable final Long id) {
        return toResponseWithLive(gameService.findById(id));
    }

    @PutMapping("/{id}/coach-rotation")
    public GameResponse setCoachRotation(@PathVariable final Long id,
                                          @RequestBody final SetCoachRotationRequest request) {
        return toResponseWithLive(gameService.setCoachRotation(
            id, request.firstBaseCoachRotation(), request.thirdBaseCoachRotation(),
            request.firstBaseCoachRotationReversed(), request.thirdBaseCoachRotationReversed()));
    }

    @PutMapping("/{id}/opponent")
    public GameResponse updateOpponent(@PathVariable final Long id, @RequestBody final UpdateGameRequest request) {
        return toResponseWithLive(gameService.updateOpponent(id, request.opponentTeamId()));
    }

    @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")
    @PutMapping("/{id}/score")
    public GameResponse setScore(@PathVariable final Long id, @RequestBody final SetGameScoreRequest request) {
        return toResponseWithLive(gameService.setScore(id, request.scoreUs(), request.scoreThem()));
    }

    @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")
    @PostMapping("/{id}/end")
    public GameResponse endGame(@PathVariable final Long id) {
        return toResponseWithLive(gameService.endGame(id));
    }

    @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")
    @PutMapping("/{id}/batting-side")
    public GameResponse setBattingSide(@PathVariable final Long id, @RequestBody @Valid final SetBattingSideRequest request) {
        return toResponseWithLive(gameService.setBattingSide(id, request.battingSide()));
    }

    @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")
    @PostMapping("/{id}/reopen")
    public GameResponse reopenGame(@PathVariable final Long id) {
        return toResponseWithLive(gameService.reopenGame(id));
    }

    /** Leer statt 403, solange die Aufstellung nicht steht — siehe {@link AufstellungSichtbarkeit}. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/lineup")
    public List<LineupEntryResponse> getLineup(@PathVariable final Long id) {
        if (!sichtbarkeit.darfSehenFuerSpiel(id)) {
            return List.of();
        }
        return lineupService.getLineup(id).stream().map(LineupEntryResponse::from).toList();
    }

    @PutMapping("/{id}/lineup")
    public List<LineupEntryResponse> setLineup(@PathVariable final Long id, @RequestBody List<@Valid LineupEntryRequest> entries) {
        return lineupService.setLineup(id, entries).stream().map(LineupEntryResponse::from).toList();
    }

    /** Regel-Check fuer einen Aufstellungs-Entwurf: Hinweise, keine Fehler. */
    @PostMapping("/{id}/lineup/check")
    public LineupRuleCheckResponse checkLineup(@PathVariable final Long id,
                                               @RequestBody final List<LineupEntryRequest> entries) {
        return lineupService.checkRules(id, entries);
    }

    @GetMapping("/{id}/lineup/suggest")
    public List<LineupSuggestionEntry> suggestLineup(@PathVariable final Long id) {
        return lineupSuggestionService.suggest(id);
    }

    /** Wer Base-Coach ist, gehoert zur Aufstellung und faellt unter dieselbe Grenze. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/staff")
    public List<GameStaffResponse> getStaff(@PathVariable final Long id) {
        if (!sichtbarkeit.darfSehenFuerSpiel(id)) {
            return List.of();
        }
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

    /** Eine Auswechslung verraet die Aufstellung von beiden Seiten — dieselbe Grenze. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/substitutions")
    public List<SubstitutionResponse> getSubstitutions(@PathVariable final Long id) {
        if (!sichtbarkeit.darfSehenFuerSpiel(id)) {
            return List.of();
        }
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
    @PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")
    @PostMapping("/{id}/substitutions")
    public SubstitutionResponse addSubstitution(@PathVariable final Long id,
                                                 @RequestBody @Valid SubstitutionRequest request) {
        return SubstitutionResponse.from(substitutionService.addSubstitution(id, request));
    }
}
