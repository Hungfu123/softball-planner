package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.AtBatResponse;
import com.softball.adapter.dto.ClockStateResponse;
import com.softball.adapter.dto.InningAdvanceEventResponse;
import com.softball.adapter.dto.NextInningRequest;
import com.softball.adapter.dto.RecordAtBatRequest;
import com.softball.adapter.dto.RecordStealingEventRequest;
import com.softball.adapter.dto.ScoreboardResponse;
import com.softball.adapter.dto.StartClockRequest;
import com.softball.adapter.dto.StealingEventResponse;
import com.softball.adapter.dto.UndoResultResponse;
import com.softball.adapter.dto.UpdateBaseStateRequest;
import com.softball.application.GameClockService;
import com.softball.application.GameScoringService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/games")
public class ScoringController {

    private final GameScoringService scoringService;
    private final GameClockService clockService;

    public ScoringController(final GameScoringService scoringService, final GameClockService clockService) {
        this.scoringService = scoringService;
        this.clockService = clockService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{gameId}/atbats")
    public List<AtBatResponse> getAtBats(@PathVariable final Long gameId) {
        return scoringService.getAtBats(gameId);
    }

    @PostMapping("/{gameId}/atbats")
    @ResponseStatus(HttpStatus.CREATED)
    public AtBatResponse recordAtBat(@PathVariable final Long gameId,
                                      @Valid @RequestBody final RecordAtBatRequest request) {
        return scoringService.recordAtBat(gameId, request);
    }

    @DeleteMapping("/{gameId}/atbats/last")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void undoLastAtBat(@PathVariable final Long gameId) {
        scoringService.undoLastAtBat(gameId);
    }

    @DeleteMapping("/{gameId}/scoring")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetScoring(@PathVariable final Long gameId) {
        scoringService.resetScoring(gameId);
    }

    @DeleteMapping("/{gameId}/scoring/current-inning")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCurrentInning(@PathVariable final Long gameId) {
        scoringService.deleteCurrentInning(gameId);
    }

    @PostMapping("/{gameId}/scoring/undo")
    public UndoResultResponse undoLastAction(@PathVariable final Long gameId) {
        return scoringService.undoLastAction(gameId);
    }

    @PostMapping("/{gameId}/scoring/next-inning")
    @ResponseStatus(HttpStatus.CREATED)
    public InningAdvanceEventResponse advanceInning(@PathVariable final Long gameId,
                                                     @Valid @RequestBody final NextInningRequest req) {
        return scoringService.advanceInning(gameId, req.opponentRuns());
    }

    @PostMapping("/{gameId}/scoring/automatic-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordAutomaticOut(@PathVariable final Long gameId) {
        scoringService.recordAutomaticOut(gameId);
    }

    @PutMapping("/{gameId}/atbats/last/base-state")
    public AtBatResponse updateLastBaseState(@PathVariable final Long gameId,
                                              @RequestBody final UpdateBaseStateRequest req) {
        return scoringService.updateLastBaseState(gameId, req.first(), req.second(), req.third(), req.runsScored(), req.rbi());
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{gameId}/stealing-events")
    public List<StealingEventResponse> getStealingEvents(@PathVariable final Long gameId) {
        return scoringService.getStealingEvents(gameId);
    }

    @PostMapping("/{gameId}/stealing-events")
    @ResponseStatus(HttpStatus.CREATED)
    public StealingEventResponse recordStealingEvent(@PathVariable final Long gameId,
                                                      @Valid @RequestBody final RecordStealingEventRequest request) {
        return scoringService.recordStealingEvent(gameId, request);
    }

    @DeleteMapping("/{gameId}/stealing-events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStealingEvent(@PathVariable final Long gameId,
                                     @PathVariable final Long eventId) {
        scoringService.deleteStealingEvent(gameId, eventId);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{gameId}/scoreboard")
    public ScoreboardResponse getScoreboard(@PathVariable final Long gameId) {
        return scoringService.getScoreboard(gameId);
    }

    @PostMapping("/{gameId}/clock/start")
    public ClockStateResponse startClock(@PathVariable final Long gameId,
                                          @Valid @RequestBody final StartClockRequest request) {
        return ClockStateResponse.from(clockService.startGameClock(gameId, request.limitMinutes()));
    }

    @PostMapping("/{gameId}/clock/pause")
    public ClockStateResponse pauseClock(@PathVariable final Long gameId) {
        return ClockStateResponse.from(clockService.pauseGameClock(gameId));
    }

    @PostMapping("/{gameId}/clock/resume")
    public ClockStateResponse resumeClock(@PathVariable final Long gameId) {
        return ClockStateResponse.from(clockService.resumeGameClock(gameId));
    }

    @PostMapping("/{gameId}/clock/reset")
    public ClockStateResponse resetClock(@PathVariable final Long gameId) {
        return ClockStateResponse.from(clockService.resetGameClock(gameId));
    }
}
