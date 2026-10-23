package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.AwardResponse;
import com.softball.application.AwardService;
import com.softball.domain.model.Award;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
public class AwardController {

    private final AwardService awardService;

    public AwardController(final AwardService awardService) {
        this.awardService = awardService;
    }

    @GetMapping("/api/gamedays/{gameDayId}/awards")
    public List<AwardResponse> getGameDayAwards(@PathVariable final Long gameDayId) {
        return toResponses(awardService.getGameDayAwards(gameDayId));
    }

    @GetMapping("/api/seasons/{seasonId}/awards")
    public List<AwardResponse> getSeasonAwards(@PathVariable final Long seasonId) {
        return toResponses(awardService.getSeasonAwards(seasonId));
    }

    @GetMapping("/api/years/{year}/awards")
    public List<AwardResponse> getYearAwards(@PathVariable final int year) {
        return toResponses(awardService.getYearAwards(year));
    }

    @GetMapping("/api/stats/all-time/awards")
    public List<AwardResponse> getAllTimeAwards() {
        return toResponses(awardService.getAllTimeAwards());
    }

    private List<AwardResponse> toResponses(final List<Award> awards) {
        return awards.stream().map(AwardResponse::from).toList();
    }
}
