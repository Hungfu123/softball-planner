package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.TrainingPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/training-plans")
public class TrainingPlanController {

    private final TrainingPlanService trainingPlanService;

    public TrainingPlanController(final TrainingPlanService trainingPlanService) {
        this.trainingPlanService = trainingPlanService;
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingPlanResponse generate(@Valid @RequestBody final GeneratePlanRequest request) {
        return trainingPlanService.generate(
                request.trainingId(), request.playerCount(),
                request.focus(), request.durationMinutes(),
                request.infieldPositionsOrEmpty(),
                request.withBeginnerGroupOrFalse(),
                request.beginnerCountOrZero(),
                request.beginnerFocus());
    }

    @GetMapping("/training/{trainingId}")
    public ResponseEntity<TrainingPlanResponse> getByTrainingId(@PathVariable final Long trainingId) {
        final TrainingPlanResponse plan = trainingPlanService.getByTrainingId(trainingId);
        return plan != null ? ResponseEntity.ok(plan) : ResponseEntity.noContent().build();
    }

    @GetMapping("/by-training-ids")
    public Map<Long, TrainingPlanResponse> getByTrainingIds(@RequestParam final List<Long> ids) {
        return trainingPlanService.getByTrainingIds(ids);
    }

    @PutMapping("/{id}")
    public TrainingPlanResponse update(@PathVariable final Long id,
                                        @Valid @RequestBody final UpdatePlanRequest request) {
        return trainingPlanService.update(id, request.content());
    }

    @PatchMapping("/{id}/sections/{index}")
    public TrainingPlanResponse updateSectionDrill(@PathVariable final Long id,
                                                    @PathVariable final int index,
                                                    @Valid @RequestBody final PatchSectionDrillRequest request) {
        return trainingPlanService.updateSectionDrill(id, index, request.drillId());
    }

    @PostMapping("/{id}/beginner-group")
    public TrainingPlanResponse addBeginnerGroup(@PathVariable final Long id,
                                                  @Valid @RequestBody final AddBeginnerGroupRequest request) {
        return trainingPlanService.addBeginnerGroup(id, request.beginnerCount(), request.beginnerFocus());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        trainingPlanService.delete(id);
    }
}
