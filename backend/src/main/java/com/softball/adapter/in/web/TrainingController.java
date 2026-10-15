package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.TrainingAttendanceService;
import com.softball.application.TrainingPeriodService;
import com.softball.application.TrainingImportService;
import com.softball.application.TrainingService;
import com.softball.application.TrainingStatsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {

    private final TrainingService trainingService;
    private final TrainingAttendanceService attendanceService;
    private final TrainingPeriodService periodService;
    private final TrainingStatsService statsService;
    private final TrainingImportService importService;

    public TrainingController(final TrainingService trainingService,
                               final TrainingAttendanceService attendanceService,
                               final TrainingPeriodService periodService,
                               final TrainingStatsService statsService,
                               final TrainingImportService importService) {
        this.trainingService = trainingService;
        this.attendanceService = attendanceService;
        this.periodService = periodService;
        this.statsService = statsService;
        this.importService = importService;
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
            request.time(), request.weekdayTimes(), request.location(), request.periodName(), request.type(),
            request.cycleWeeks(), request.activeWeeksInCycle(), request.pcOnlyWeekdays()
        );
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingImportResponse importCsv(@Valid @RequestBody final ImportTrainingRequest request) {
        return importService.importCsv(request.csv(), request.periodName());
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
        return attendanceService.getAllAttendance(periodId);
    }

    @GetMapping("/{id}/attendance")
    public List<TrainingAttendanceResponse> getAttendance(@PathVariable final Long id) {
        return attendanceService.getAttendance(id);
    }

    @PutMapping("/{id}/attendance")
    public List<TrainingAttendanceResponse> setAttendance(@PathVariable final Long id,
                                                           @Valid @RequestBody final SetAttendanceRequest request) {
        return attendanceService.setAttendance(id, request.entries());
    }

    @GetMapping("/stats")
    public List<TrainingStatsResponse> getStats(@RequestParam(required = false) final Long periodId,
                                                 @RequestParam(required = false) final java.time.LocalDate since,
                                                 @RequestParam(required = false) final java.time.LocalDate until,
                                                 @RequestParam(required = false) final List<Integer> excludeWeekdays,
                                                 @RequestParam(required = false, defaultValue = "false")
                                                 final boolean onlyOpenToAll) {
        return statsService.getStats(periodId, since, until,
            excludeWeekdays != null ? excludeWeekdays : List.of(), onlyOpenToAll);
    }

    // --- Period endpoints ---

    @GetMapping("/periods")
    public List<TrainingPeriodResponse> getPeriods() {
        return periodService.findAll();
    }

    @PostMapping("/periods")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingPeriodResponse createPeriod(@Valid @RequestBody final CreateTrainingPeriodRequest request) {
        return periodService.create(request.name(), request.startDate(), request.endDate());
    }

    @PutMapping("/periods/{id}")
    public TrainingPeriodResponse updatePeriod(@PathVariable final Long id,
                                                @Valid @RequestBody final UpdateTrainingPeriodRequest request) {
        return periodService.update(id, request.name(), request.startDate(), request.endDate(),
            request.weekdays(), request.time(), request.weekdayTimes(), request.location(),
            request.cycleWeeks(), request.activeWeeksInCycle(), request.pcOnlyWeekdays());
    }

    @DeleteMapping("/periods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePeriod(@PathVariable final Long id) {
        periodService.delete(id);
    }
}
