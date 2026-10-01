package com.softball.adapter.in.web;

import com.softball.adapter.dto.CopyYearRequest;
import com.softball.adapter.dto.CreateSeasonRequest;
import com.softball.adapter.dto.SeasonPlayerStats;
import com.softball.adapter.dto.SeasonResponse;
import com.softball.adapter.dto.YearCopyResponse;
import com.softball.application.SeasonService;
import com.softball.application.StatsService;
import com.softball.domain.model.YearCopyResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

    private final SeasonService seasonService;
    private final StatsService statsService;

    public SeasonController(final SeasonService seasonService, final StatsService statsService) {
        this.seasonService = seasonService;
        this.statsService = statsService;
    }

    @GetMapping
    public List<SeasonResponse> getAll() {
        return seasonService.findAll().stream().map(SeasonResponse::from).toList();
    }

    @GetMapping("/{id}")
    public SeasonResponse getById(@PathVariable final Long id) {
        return SeasonResponse.from(seasonService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SeasonResponse create(@Valid @RequestBody final CreateSeasonRequest request) {
        return SeasonResponse.from(seasonService.create(request.name(), request.year()));
    }

    @PostMapping("/copy-year")
    public YearCopyResponse copyYear(@Valid @RequestBody final CopyYearRequest request) {
        final YearCopyResult result = seasonService.copyYear(
            request.templateYear(), request.targetYear(), request.copyTeams());
        return YearCopyResponse.from(result);
    }

    @PutMapping("/{id}")
    public SeasonResponse update(@PathVariable final Long id, @Valid @RequestBody final CreateSeasonRequest request) {
        return SeasonResponse.from(seasonService.update(id, request.name(), request.year()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        seasonService.delete(id);
    }

    @GetMapping("/{id}/stats")
    public List<SeasonPlayerStats> getStats(@PathVariable final Long id) {
        return statsService.getSeasonStats(id);
    }

    @GetMapping("/years")
    public List<Integer> getYears() {
        return seasonService.getDistinctYears();
    }
}
