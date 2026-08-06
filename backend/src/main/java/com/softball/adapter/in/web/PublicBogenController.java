package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.SpielbogenShareService;
import com.softball.application.SpielbogenSheetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

/**
 * Öffentlicher, unauthentifizierter Zuschauer-Feed für einen Spielbogen.
 * Zugriff nur über einen Token (siehe {@link SpielbogenShareService}) — kein Basic-Auth
 * nötig, deshalb liefert der Endpoint bewusst nur ein reduziertes DTO ohne interne Felder.
 */
@RestController
@RequestMapping("/api/public")
public class PublicBogenController {

    private final SpielbogenShareService shareService;
    private final SpielbogenSheetService sheetService;

    public PublicBogenController(final SpielbogenShareService shareService,
                                 final SpielbogenSheetService sheetService) {
        this.shareService = shareService;
        this.sheetService = sheetService;
    }

    @GetMapping("/bogen/{token}")
    public ResponseEntity<PublicBogenFeedResponse> feed(@PathVariable String token) {
        var bogen = shareService.resolve(token);
        var data = sheetService.getSheet(bogen.getId());

        var body = new PublicBogenFeedResponse(
            data.bogen().getHomeTeamName(),
            data.bogen().getAwayTeamName(),
            data.bogen().getDate(),
            data.bogen().getLocation(),
            data.bogen().getStatus(),
            data.bogen().getCurrentInning(),
            data.bogen().getCurrentSide(),
            data.bogen().getHomeRuns(),
            data.bogen().getAwayRuns(),
            data.homeLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            data.awayLineup().stream().map(SpielbogenSlotResponse::from).toList(),
            data.homeAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
            data.awayAtBats().stream().map(SpielbogenAtBatResponse::from).toList(),
            data.stealings().stream().map(SpielbogenStealingResponse::from).toList(),
            data.subs().stream().map(SpielbogenSubstitutionResponse::from).toList(),
            data.inningRuns().entrySet().stream().collect(Collectors.toMap(
                java.util.Map.Entry::getKey,
                e -> new BogenSheetResponse.InningRuns(e.getValue().getHome(), e.getValue().getAway())
            )),
            new BogenSheetResponse.TeamTotals(
                data.homeTotals().runs(), data.homeTotals().hits(), data.homeTotals().errors()),
            new BogenSheetResponse.TeamTotals(
                data.awayTotals().runs(), data.awayTotals().hits(), data.awayTotals().errors())
        );

        return ResponseEntity.ok()
            .header("X-Robots-Tag", "noindex")
            .body(body);
    }
}
