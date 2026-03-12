package com.softball.controller;

import com.softball.dto.*;
import com.softball.service.TrainingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(final TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @GetMapping
    public List<TrainingResponse> getAll(@RequestParam(required = false) final Long periodId) {
        return trainingService.findAll(periodId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingResponse create(@Valid @RequestBody final CreateTrainingRequest request) {
        return trainingService.create(request.date(), request.time(), request.location(), request.type());
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public List<TrainingResponse> createBulk(@Valid @RequestBody final CreateBulkTrainingRequest request) {
        return trainingService.createBulk(
            request.weekdays(), request.startDate(), request.endDate(),
            request.time(), request.location(), request.periodName(), request.type()
        );
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingImportResponse importCsv(@Valid @RequestBody final ImportTrainingRequest request) {
        return trainingService.importCsv(request.csv(), request.periodName());
    }

    @PutMapping("/{id}")
    public TrainingResponse update(@PathVariable final Long id,
                                   @RequestBody final UpdateTrainingRequest request) {
        return trainingService.update(id, request.date(), request.time(), request.location(), request.cancelled(), request.type());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        trainingService.delete(id);
    }

    @GetMapping("/attendance/all")
    public java.util.Map<Long, List<TrainingAttendanceResponse>> getAllAttendance(
            @RequestParam(required = false) final Long periodId) {
        return trainingService.getAllAttendance(periodId);
    }

    @GetMapping("/{id}/attendance")
    public List<TrainingAttendanceResponse> getAttendance(@PathVariable final Long id) {
        return trainingService.getAttendance(id);
    }

    @PutMapping("/{id}/attendance")
    public List<TrainingAttendanceResponse> setAttendance(@PathVariable final Long id,
                                                           @Valid @RequestBody final SetAttendanceRequest request) {
        return trainingService.setAttendance(id, request.entries());
    }

    @GetMapping("/stats")
    public List<TrainingStatsResponse> getStats(@RequestParam(required = false) final Long periodId) {
        return trainingService.getStats(periodId);
    }

    // --- Period endpoints ---

    @GetMapping("/periods")
    public List<TrainingPeriodResponse> getPeriods() {
        return trainingService.findAllPeriods();
    }

    @PostMapping("/periods")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingPeriodResponse createPeriod(@Valid @RequestBody final CreateTrainingPeriodRequest request) {
        return trainingService.createPeriod(request.name(), request.startDate(), request.endDate());
    }

    @DeleteMapping("/periods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePeriod(@PathVariable final Long id) {
        trainingService.deletePeriod(id);
    }
}
