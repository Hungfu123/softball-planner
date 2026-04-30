package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.service.BogenScoreCalculator;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SpielbogenSheetService {

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotService slotService;
    private final SpielbogenScoringService scoringService;
    private final BogenScoreCalculator scoreCalc;

    public SpielbogenSheetService(final SpielbogenRepository bogenRepo,
                                  final SpielbogenSlotService slotService,
                                  final SpielbogenScoringService scoringService,
                                  final BogenScoreCalculator scoreCalc) {
        this.bogenRepo = bogenRepo;
        this.slotService = slotService;
        this.scoringService = scoringService;
        this.scoreCalc = scoreCalc;
    }

    public record SheetData(
        Spielbogen bogen,
        List<SpielbogenSlot> homeLineup,
        List<SpielbogenSlot> awayLineup,
        List<SpielbogenAtBat> homeAtBats,
        List<SpielbogenAtBat> awayAtBats,
        List<SpielbogenStealingEvent> stealings,
        List<SpielbogenSubstitution> subs,
        Map<Integer, BogenScoreCalculator.InningRuns> inningRuns
    ) {}

    @Transactional(readOnly = true)
    public SheetData getSheet(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        var lineup = slotService.getLineup(bogenId);

        var homeAtBats = scoringService.findAtBats(bogenId, BogenSide.HOME);
        var awayAtBats = scoringService.findAtBats(bogenId, BogenSide.AWAY);

        var allAtBats = new ArrayList<SpielbogenAtBat>();
        allAtBats.addAll(homeAtBats);
        allAtBats.addAll(awayAtBats);

        return new SheetData(
            bogen,
            lineup.home(),
            lineup.away(),
            homeAtBats,
            awayAtBats,
            scoringService.findStealingEvents(bogenId),
            scoringService.findSubstitutions(bogenId),
            scoreCalc.calculateInningRuns(allAtBats)
        );
    }
}
