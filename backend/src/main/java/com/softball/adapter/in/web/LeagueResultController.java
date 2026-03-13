package com.softball.adapter.in.web;

import com.softball.adapter.dto.CreateLeagueResultRequest;
import com.softball.adapter.dto.LeagueResultResponse;
import com.softball.application.LeagueResultService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LeagueResultController {

    private final LeagueResultService leagueResultService;

    public LeagueResultController(final LeagueResultService leagueResultService) {
        this.leagueResultService = leagueResultService;
    }

    @GetMapping("/seasons/{seasonId}/results")
    public List<LeagueResultResponse> getBySeasonId(@PathVariable final Long seasonId) {
        return leagueResultService.findBySeasonId(seasonId).stream()
            .map(LeagueResultResponse::from)
            .toList();
    }

    @PostMapping("/seasons/{seasonId}/results")
    @ResponseStatus(HttpStatus.CREATED)
    public LeagueResultResponse create(@PathVariable final Long seasonId,
                                       @Valid @RequestBody final CreateLeagueResultRequest request) {
        return LeagueResultResponse.from(leagueResultService.create(seasonId, request));
    }

    @PutMapping("/results/{resultId}")
    public LeagueResultResponse update(@PathVariable final Long resultId,
                                       @Valid @RequestBody final CreateLeagueResultRequest request) {
        return LeagueResultResponse.from(leagueResultService.update(resultId, request));
    }

    @DeleteMapping("/results/{resultId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long resultId) {
        leagueResultService.delete(resultId);
    }
}
