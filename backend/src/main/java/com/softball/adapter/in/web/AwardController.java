package com.softball.adapter.in.web;

import com.softball.adapter.dto.AwardResponse;
import com.softball.application.AwardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AwardController {

    private final AwardService awardService;

    public AwardController(final AwardService awardService) {
        this.awardService = awardService;
    }

    @GetMapping("/api/gamedays/{gameDayId}/awards")
    public List<AwardResponse> getGameDayAwards(@PathVariable final Long gameDayId) {
        return awardService.getGameDayAwards(gameDayId).stream()
            .map(AwardResponse::from)
            .toList();
    }
}
