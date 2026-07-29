package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.GameStaff;
import com.softball.domain.model.LineupEntry;
import com.softball.application.GameDayService;
import com.softball.application.GameDayVoteSyncService;
import com.softball.application.GameStaffService;
import com.softball.application.LineupService;
import com.softball.application.LineupSuggestionService;
import com.softball.application.SubstitutionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class GameDayController {

    private final GameDayService gameDayService;
    private final LineupService lineupService;
    private final GameStaffService gameStaffService;
    private final LineupSuggestionService lineupSuggestionService;
    private final SubstitutionService substitutionService;
    private final GameDayVoteSyncService voteSyncService;

    public GameDayController(final GameDayService gameDayService,
                             final LineupService lineupService,
                             final GameStaffService gameStaffService,
                             final LineupSuggestionService lineupSuggestionService,
                             final SubstitutionService substitutionService,
                             final GameDayVoteSyncService voteSyncService) {
        this.gameDayService = gameDayService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
        this.substitutionService = substitutionService;
        this.voteSyncService = voteSyncService;
    }

    @GetMapping("/seasons/{seasonId}/gamedays")
    public List<GameDayResponse> getBySeasonId(@PathVariable final Long seasonId) {
        return gameDayService.findBySeasonIdAsDto(seasonId);
    }

    @PostMapping("/seasons/{seasonId}/gamedays")
    @ResponseStatus(HttpStatus.CREATED)
    public GameDayResponse create(@PathVariable final Long seasonId,
                                  @Valid @RequestBody final CreateGameDayRequest request) {
        return gameDayService.create(seasonId, request.date(), request.label(), request.location(), request.numberOfGames());
    }

    @GetMapping("/gamedays/all")
    public List<GameDayResponse> getAll() {
        return gameDayService.findAllAsDto();
    }

    @GetMapping("/gamedays/{id}")
    public GameDayResponse getById(@PathVariable final Long id) {
        return gameDayService.findByIdAsDto(id);
    }

    @PutMapping("/gamedays/{id}")
    public GameDayResponse update(@PathVariable final Long id,
                                  @Valid @RequestBody final UpdateGameDayRequest request) {
        return gameDayService.update(id, request.date(), request.label(), request.location(), request.numberOfGames());
    }

    @PutMapping("/gamedays/{id}/players")
    public GameDayResponse setAvailablePlayers(@PathVariable final Long id,
                                               @Valid @RequestBody final SetAvailablePlayersRequest request) {
        return gameDayService.setAvailablePlayers(id, request.playerIds());
    }

    @GetMapping("/gamedays/{id}/lineups")
    public GameDayLineupsResponse getLineups(@PathVariable final Long id) {
        final GameDay gameDay = gameDayService.findById(id);
        final List<Long> gameIds = gameDay.getGames().stream().map(g -> g.getId()).toList();

        final Map<Long, List<LineupEntryResponse>> lineups = lineupService.getLineupsForGames(gameIds);
        final Map<Long, List<GameStaffResponse>> staff = gameStaffService.getStaffForGames(gameIds);
        final Map<Long, List<SubstitutionResponse>> substitutions = substitutionService.getSubstitutionsForGames(gameIds);

        return new GameDayLineupsResponse(lineups, staff, substitutions);
    }

    @GetMapping("/gamedays/{id}/stats")
    public List<GameDayPlayerStats> getStats(@PathVariable final Long id) {
        return gameDayService.getStats(id);
    }

    @PostMapping("/gamedays/{id}/lineup/suggest-all")
    public SuggestAllResponse suggestAll(@PathVariable final Long id) {
        return lineupSuggestionService.suggestAndSaveAll(id);
    }

    @PostMapping("/gamedays/{id}/lineup/undo")
    public Map<Long, List<LineupEntryResponse>> undoSuggestAll(@PathVariable final Long id,
                                                                @RequestBody final UndoSuggestAllRequest request) {
        return lineupSuggestionService.undoSuggestAll(id, request.oldLineups());
    }

    @DeleteMapping("/gamedays/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        gameDayService.delete(id);
    }

    @PostMapping("/gamedays/{id}/poll-votes/fetch")
    public GameDayVotePreviewResponse fetchPollVotes(@PathVariable final Long id) {
        return GameDayVotePreviewResponse.from(voteSyncService.fetchAndPreview(id));
    }

    @GetMapping("/gamedays/{id}/poll-votes")
    public GameDayVotePreviewResponse storedPollVotes(@PathVariable final Long id) {
        return GameDayVotePreviewResponse.from(voteSyncService.stored(id));
    }
}
