package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.SpielbogenService;
import com.softball.application.SpielbogenSlotService;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spielbogen")
public class SpielbogenController {

    private final SpielbogenService bogenService;
    private final SpielbogenSlotService slotService;

    public SpielbogenController(final SpielbogenService bogenService, final SpielbogenSlotService slotService) {
        this.bogenService = bogenService;
        this.slotService = slotService;
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
}
