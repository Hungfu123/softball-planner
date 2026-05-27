package com.softball.application;

import com.softball.adapter.dto.TrainingPlanContentResponse;
import com.softball.adapter.dto.TrainingPlanResponse;
import com.softball.domain.model.Drill;
import com.softball.domain.model.InfieldPosition;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.service.TrainingPlanGenerator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TrainingPlanService {

    private static final Logger log = LoggerFactory.getLogger(TrainingPlanService.class);

    private final TrainingPlanRepository trainingPlanRepository;
    private final TrainingRepository trainingRepository;
    private final DrillService drillService;
    private final TrainingPlanGenerator generator = new TrainingPlanGenerator();

    public TrainingPlanService(final TrainingPlanRepository trainingPlanRepository,
                               final TrainingRepository trainingRepository,
                               final DrillService drillService) {
        this.trainingPlanRepository = trainingPlanRepository;
        this.trainingRepository = trainingRepository;
        this.drillService = drillService;
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes) {
        return generate(trainingId, playerCount, focus, durationMinutes, List.of(), false, 0);
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions) {
        return generate(trainingId, playerCount, focus, durationMinutes, infieldPositions, false, 0);
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions,
                                         final boolean withBeginnerGroup,
                                         final int beginnerCount) {
        if (!trainingRepository.existsById(trainingId)) {
            throw new ResourceNotFoundException("Training", trainingId);
        }

        if (trainingPlanRepository.existsByTrainingId(trainingId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trainingsplan existiert bereits für dieses Training");
        }

        final List<InfieldPosition> safePositions = infieldPositions != null ? infieldPositions : List.of();

        // Deterministischer Generator — kein KI-Call nötig
        final List<Drill> drills = drillService.filterByFocus(focus, playerCount);
        final TrainingPlanContent content = generator.generate(drills, playerCount, focus, durationMinutes,
                safePositions, withBeginnerGroup, beginnerCount);

        final TrainingPlan plan = new TrainingPlan(trainingId, playerCount, focus, durationMinutes);
        plan.setContent(content);
        plan.setInfieldPositions(safePositions);
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public Map<Long, TrainingPlanResponse> getByTrainingIds(final List<Long> trainingIds) {
        if (trainingIds == null || trainingIds.isEmpty()) return Map.of();
        return trainingPlanRepository.findByTrainingIdIn(trainingIds).stream()
                .collect(Collectors.toMap(
                        p -> p.getTrainingId(),
                        TrainingPlanResponse::from
                ));
    }

    @Transactional(readOnly = true)
    public TrainingPlanResponse getByTrainingId(final Long trainingId) {
        return trainingPlanRepository.findByTrainingId(trainingId)
                .map(TrainingPlanResponse::from)
                .orElse(null);
    }

    @Transactional
    public TrainingPlanResponse update(final Long planId, final TrainingPlanContentResponse contentDto) {
        final TrainingPlan plan = trainingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));
        plan.setContent(contentDto.toDomain());
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }

    @Transactional
    public void delete(final Long planId) {
        if (trainingPlanRepository.findById(planId).isEmpty()) {
            throw new ResourceNotFoundException("TrainingPlan", planId);
        }
        trainingPlanRepository.deleteById(planId);
    }

    @Transactional
    public TrainingPlanResponse updateSectionDrill(final Long planId, final int sectionIndex, final String drillId) {
        final TrainingPlan plan = trainingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));

        final List<TrainingPlanSection> sections = plan.getContent().getSections();
        if (sectionIndex < 0 || sectionIndex >= sections.size()) {
            throw new BusinessValidationException("Section-Index " + sectionIndex
                    + " außerhalb des Range (0.." + (sections.size() - 1) + ")");
        }

        final Drill newDrill = drillService.findById(drillId)
                .orElseThrow(() -> new ResourceNotFoundException("Drill not found: " + drillId));

        final TrainingPlanSection target = sections.get(sectionIndex);
        target.setDrillId(newDrill.getId());
        target.setTitle(newDrill.getName());
        target.setRotationPlan(newDrill.getRotation());
        target.setSetupNotes(null);
        target.setTips(null);

        log.info("Section {} in Plan {} drillId getauscht: → {}", sectionIndex, planId, drillId);
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }
}
