package com.softball.domain.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class TrainingPeriod {
    private Long id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> weekdays = new ArrayList<>();
    private String time;
    private String location;
    private Map<Integer, String> weekdayTimes = new LinkedHashMap<>();
    private int cycleWeeks = 1;
    private List<Integer> activeWeeksInCycle = new ArrayList<>(List.of(1));

    public TrainingPeriod() {}

    public TrainingPeriod(final String name, final LocalDate startDate, final LocalDate endDate) {
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public TrainingPeriod(final Long id, final String name, final LocalDate startDate, final LocalDate endDate) {
        this.id = id;
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(final LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(final LocalDate endDate) { this.endDate = endDate; }

    public List<Integer> getWeekdays() { return weekdays; }
    public void setWeekdays(final List<Integer> weekdays) { this.weekdays = weekdays != null ? weekdays : new ArrayList<>(); }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }

    public Map<Integer, String> getWeekdayTimes() { return weekdayTimes; }
    public void setWeekdayTimes(final Map<Integer, String> weekdayTimes) { this.weekdayTimes = weekdayTimes != null ? weekdayTimes : new LinkedHashMap<>(); }

    public int getCycleWeeks() { return cycleWeeks; }
    public void setCycleWeeks(final int cycleWeeks) { this.cycleWeeks = cycleWeeks; }
    public List<Integer> getActiveWeeksInCycle() { return activeWeeksInCycle; }
    public void setActiveWeeksInCycle(final List<Integer> activeWeeksInCycle) {
        this.activeWeeksInCycle = (activeWeeksInCycle != null && !activeWeeksInCycle.isEmpty())
            ? new ArrayList<>(activeWeeksInCycle) : new ArrayList<>(List.of(1));
    }
}
