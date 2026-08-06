package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.adapter.dto.LeagueResultResponse;
import com.softball.application.SpielbogenService;
import com.softball.application.SpielbogenShareService;
import com.softball.application.SpielbogenSheetService;
import com.softball.application.SpielbogenScoringService;
import com.softball.application.SpielbogenSlotService;
import com.softball.domain.model.BogenBaseState;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/spielbogen")
public class SpielbogenController {

    private final SpielbogenService bogenService;
    private final SpielbogenSlotService slotService;
    private final SpielbogenScoringService scoringService;
    private final SpielbogenSheetService sheetService;
    private final SpielbogenShareService shareService;

    public SpielbogenController(final SpielbogenService bogenService,
                                final SpielbogenSlotService slotService,
                                final SpielbogenScoringService scoringService,
                                final SpielbogenSheetService sheetService,
                                final SpielbogenShareService shareService) {
        this.bogenService = bogenService;
        this.slotService = slotService;
        this.scoringService = scoringService;
        this.sheetService = sheetService;
        this.shareService = shareService;
    }

    @GetMapping
    public List<SpielbogenResponse> list(@RequestParam(required = false) Long seasonId,
                                         @RequestParam(required = false) BogenStatus status) {
        List<Spielbogen> result;
        if (seasonId != null) {
            result = bogenService.findBySeasonId(seasonId);
        } else if (status != null) {
            result = bogenService.findByStatus(status);
        } else {
            result = bogenService.findAll();
        }
        return result.stream().map(SpielbogenResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SpielbogenResponse create(@Valid @RequestBody CreateSpielbogenRequest req) {
        Spielbogen created = bogenService.create(req.date(), req.location(),
                                                  req.homeTeamName(), req.awayTeamName(),
                                                  req.seasonId());
        return SpielbogenResponse.from(created);
    }

    @GetMapping("/{id}")
    public SpielbogenResponse getById(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.findById(id));
    }

    @PatchMapping("/{id}")
    public SpielbogenResponse update(@PathVariable Long id, @Valid @RequestBody UpdateSpielbogenRequest req) {
        Spielbogen updated = bogenService.update(id, req.date(), req.location(),
                                                  req.homeTeamName(), req.awayTeamName(),
                                                  req.seasonId());
        return SpielbogenResponse.from(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        bogenService.delete(id);
    }

    @PostMapping("/{id}/share")
    public ShareLinkResponse createShareLink(@PathVariable Long id) {
        return new ShareLinkResponse(shareService.createOrGetToken(id));
    }

    @DeleteMapping("/{id}/share")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShareLink(@PathVariable Long id) {
        shareService.revokeToken(id);
    }

    @PostMapping("/{id}/start")
    public SpielbogenResponse start(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.start(id));
    }

    @PostMapping("/{id}/end")
    public SpielbogenResponse end(@PathVariable Long id, @RequestBody(required = false) EndGameRequest req) {
        Integer hr = req != null ? req.homeRuns() : null;
        Integer ar = req != null ? req.awayRuns() : null;
        return SpielbogenResponse.from(bogenService.end(id, hr, ar));
    }

    @PostMapping("/{id}/reopen")
    public SpielbogenResponse reopen(@PathVariable Long id) {
        return SpielbogenResponse.from(bogenService.reopen(id));
    }

    @PostMapping("/{id}/register-league-result")
    public LeagueResultResponse registerLeagueResult(@PathVariable Long id) {
        var result = bogenService.registerLeagueResult(id);
        return LeagueResultResponse.from(result);
    }

    @GetMapping("/{id}/lineup")
    public SpielbogenLineupResponse getLineup(@PathVariable Long id) {
        var lineup = slotService.getLineup(id);
        return new SpielbogenLineupResponse(
            lineup.home().stream().map(SpielbogenSlotResponse::from).toList(),
            lineup.away().stream().map(SpielbogenSlotResponse::from).toList()
        );
    }

    @PutMapping("/{id}/lineup")
    public List<SpielbogenSlotResponse> setLineup(@PathVariable Long id, @Valid @RequestBody SetLineupRequest req) {
        List<SpielbogenSlot> slots = req.slots().stream().map(e -> {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(e.slot());
            s.setName(e.name());
            s.setPosition(e.position());
            s.setBattingOrder(e.battingOrder());
            return s;
        }).toList();
        return slotService.setLineup(id, req.side(), slots).stream()
                          .map(SpielbogenSlotResponse::from).toList();
    }

    @PatchMapping("/{id}/slots/{slotId}")
    public SpielbogenSlotResponse updateSlot(@PathVariable Long id, @PathVariable Long slotId,
                                             @Valid @RequestBody UpdateSlotRequest req) {
        return SpielbogenSlotResponse.from(
            slotService.updateSlot(id, slotId, req.name(), req.position(), req.battingOrder())
        );
    }

    @PostMapping("/{id}/lineup/copy-from-gameday")
    public List<SpielbogenSlotResponse> copyFromGameDay(@PathVariable Long id,
                                                        @Valid @RequestBody CopyFromGameDayRequest req) {
        return slotService.copyFromGameDay(id, req.gameDayId(), req.gameNumber(), req.targetSide())
                          .stream().map(SpielbogenSlotResponse::from).toList();
    }

    @PostMapping("/{id}/at-bats")
    @ResponseStatus(HttpStatus.CREATED)
    public SpielbogenAtBatResponse recordAtBat(@PathVariable Long id,
                                               @Valid @RequestBody SpielbogenRecordAtBatRequest req) {
        BogenBaseState bs = req.baseStateAfter() != null
            ? new BogenBaseState(
                req.baseStateAfter().firstSlotId(),
                req.baseStateAfter().secondSlotId(),
                req.baseStateAfter().thirdSlotId())
            : null;
        var advances = req.runnerAdvances() == null
            ? java.util.List.<SpielbogenScoringService.RunnerAdvanceEntry>of()
            : req.runnerAdvances().stream()
                .map(e -> new SpielbogenScoringService.RunnerAdvanceEntry(e.slotId(), e.fromBase(), e.toBase(), e.reason()))
                .toList();
        var saved = scoringService.recordAtBat(id, req.side(), req.slotId(), req.inning(),
            req.result(), req.outType(), req.sacrificeType(), req.fielderChain(),
            req.isError(), req.errorPosition(),
            req.runsScored(), req.rbi(), bs, advances);
        var savedAdvances = scoringService.findRunnerAdvancesForAtBat(saved.getId());
        return SpielbogenAtBatResponse.from(saved, savedAdvances);
    }

    @GetMapping("/{id}/at-bats")
    public List<SpielbogenAtBatResponse> getAtBats(@PathVariable Long id,
                                                    @RequestParam(required = false) BogenSide side) {
        return scoringService.findAtBats(id, side).stream().map(SpielbogenAtBatResponse::from).toList();
    }

    @DeleteMapping("/{id}/at-bats/last")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void undoLast(@PathVariable Long id, @RequestParam BogenSide side) {
        scoringService.undoLast(id, side);
    }

    @PatchMapping("/{id}/at-bats/last")
    public SpielbogenAtBatResponse correctLastAtBat(@PathVariable Long id,
                                                     @RequestParam BogenSide side,
                                                     @Valid @RequestBody CorrectAtBatRequest req) {
        com.softball.domain.model.BogenBaseState bs = new com.softball.domain.model.BogenBaseState(
            req.firstSlotId(), req.secondSlotId(), req.thirdSlotId()
        );
        var advances = req.runnerAdvances() == null ? null : req.runnerAdvances().stream()
            .map(e -> new com.softball.application.SpielbogenScoringService.RunnerAdvanceEntry(
                e.slotId(), e.fromBase(), e.toBase(), e.reason()))
            .toList();
        var saved = scoringService.updateLastAtBatBaseState(id, side, bs, req.runsScored(), advances);
        return SpielbogenAtBatResponse.from(saved);
    }

    @PostMapping("/{id}/stealing-events")
    @ResponseStatus(HttpStatus.CREATED)
    public SpielbogenStealingResponse recordStealing(@PathVariable Long id,
                                                     @Valid @RequestBody SpielbogenRecordStealingRequest req) {
        var saved = scoringService.recordStealingEvent(id, req.side(), req.slotId(), req.inning(),
            req.type(), req.fromBase(), req.toBase());
        return SpielbogenStealingResponse.from(saved);
    }

    @DeleteMapping("/{id}/stealing-events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStealing(@PathVariable Long id, @PathVariable Long eventId) {
        scoringService.deleteStealingEvent(id, eventId);
    }

    @DeleteMapping("/{id}/stealing/last")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLastStealing(@PathVariable Long id, @RequestParam BogenSide side) {
        scoringService.deleteLastStealingForSide(id, side);
    }

    @PostMapping("/{id}/substitutions")
    @ResponseStatus(HttpStatus.CREATED)
    public SpielbogenSubstitutionResponse recordSubstitution(@PathVariable Long id,
                                                             @Valid @RequestBody SpielbogenRecordSubstitutionRequest req) {
        boolean pinch = req.pinchHitter() != null && req.pinchHitter();
        var saved = scoringService.recordSubstitution(id, req.side(), req.slotId(), req.inning(),
            req.playerInName(), pinch);
        return SpielbogenSubstitutionResponse.from(saved);
    }

    @DeleteMapping("/{id}/substitutions/{subId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubstitution(@PathVariable Long id, @PathVariable Long subId) {
        scoringService.deleteSubstitution(id, subId);
    }

    @PostMapping("/{id}/position-swaps")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SpielbogenPositionChangeResponse> recordPositionSwap(@PathVariable Long id,
                                                                     @Valid @RequestBody SpielbogenRecordPositionSwapRequest req) {
        var entries = req.changes().stream()
            .map(c -> new SpielbogenScoringService.SwapEntry(c.slotId(), c.newPosition()))
            .toList();
        return scoringService.recordPositionSwap(id, req.side(), req.inning(), entries).stream()
            .map(SpielbogenPositionChangeResponse::from)
            .toList();
    }

    @PostMapping("/{id}/switch-side")
    public SpielbogenResponse switchSide(@PathVariable Long id) {
        return SpielbogenResponse.from(scoringService.switchSide(id));
    }

    @PostMapping("/{id}/set-side")
    public SpielbogenResponse setCurrentSide(@PathVariable Long id, @RequestParam BogenSide side) {
        return SpielbogenResponse.from(scoringService.setCurrentSide(id, side));
    }

    @PostMapping("/{id}/reset")
    public SpielbogenResponse resetScoring(@PathVariable Long id) {
        return SpielbogenResponse.from(scoringService.resetScoring(id));
    }

    @GetMapping("/{id}/sheet")
    public BogenSheetResponse getSheet(@PathVariable Long id) {
        var data = sheetService.getSheet(id);
        List<SpielbogenAtBatResponse> homeAtBatsResponse = data.homeAtBats().stream()
            .map(ab -> {
                var perAbAdvances = data.runnerAdvances().stream()
                    .filter(adv -> adv.getAtBat() != null && ab.getId().equals(adv.getAtBat().getId()))
                    .toList();
                return SpielbogenAtBatResponse.from(ab, perAbAdvances);
            })
            .toList();
        List<SpielbogenAtBatResponse> awayAtBatsResponse = data.awayAtBats().stream()
            .map(ab -> {
                var perAbAdvances = data.runnerAdvances().stream()
                    .filter(adv -> adv.getAtBat() != null && ab.getId().equals(adv.getAtBat().getId()))
                    .toList();
                return SpielbogenAtBatResponse.from(ab, perAbAdvances);
            })
            .toList();
        return new BogenSheetResponse(
            SpielbogenResponse.from(data.bogen()),
            data.homeLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            data.awayLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            homeAtBatsResponse,
            awayAtBatsResponse,
            data.stealings().stream().map(SpielbogenStealingResponse::from).toList(),
            data.subs().stream().map(SpielbogenSubstitutionResponse::from).toList(),
            data.positionChanges().stream().map(SpielbogenPositionChangeResponse::from).toList(),
            data.runnerAdvances().stream().map(SpielbogenRunnerAdvanceResponse::from).toList(),
            data.inningRuns().entrySet().stream().collect(Collectors.toMap(
                java.util.Map.Entry::getKey,
                e -> new BogenSheetResponse.InningRuns(e.getValue().getHome(), e.getValue().getAway())
            )),
            new BogenSheetResponse.TeamTotals(
                data.homeTotals().runs(), data.homeTotals().hits(), data.homeTotals().errors()),
            new BogenSheetResponse.TeamTotals(
                data.awayTotals().runs(), data.awayTotals().hits(), data.awayTotals().errors())
        );
    }
}
