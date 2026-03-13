package com.softball.controller;

import com.softball.dto.*;
import com.softball.entity.GameDay;
import com.softball.entity.GameStaff;
import com.softball.entity.LineupEntry;
import com.softball.service.GameDayService;
import com.softball.service.GameStaffService;
import com.softball.service.LineupService;
import com.softball.service.LineupSuggestionService;
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

    public GameDayController(final GameDayService gameDayService,
                             final LineupService lineupService,
                             final GameStaffService gameStaffService,
                             final LineupSuggestionService lineupSuggestionService) {
        this.gameDayService = gameDayService;
        this.lineupService = lineupService;
        this.gameStaffService = gameStaffService;
        this.lineupSuggestionService = lineupSuggestionService;
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

    @GetMapping("/gamedays/{id}/lineups")
    public GameDayLineupsResponse getLineups(@PathVariable final Long id) {
        final GameDay gameDay = gameDayService.findById(id);
        final List<Long> gameIds = gameDay.getGames().stream().map(g -> g.getId()).toList();

        final Map<Long, List<LineupEntryResponse>> lineups = lineupService.getLineupsForGames(gameIds);
        final Map<Long, List<GameStaffResponse>> staff = gameStaffService.getStaffForGames(gameIds);

        return new GameDayLineupsResponse(lineups, staff);
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
}
