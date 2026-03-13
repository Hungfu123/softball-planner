package com.softball.domain.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class Training {
    private Long id;
    private LocalDate date;
    private String time;
    private String location;
    private boolean cancelled;
    private String type;
    private TrainingPeriod period;
    private List<TrainingAttendance> attendances = new ArrayList<>();

    public Training() {}

    public Training(final LocalDate date, final String time, final String location) {
        this.date = date;
        this.time = time;
        this.location = location;
    }

    public Training(final Long id, final LocalDate date, final String time, final String location) {
        this.id = id;
        this.date = date;
        this.time = time;
        this.location = location;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
    public boolean isCancelled() { return cancelled; }
    public void setCancelled(final boolean cancelled) { this.cancelled = cancelled; }
    public String getType() { return type; }
    public void setType(final String type) { this.type = type; }
    public TrainingPeriod getPeriod() { return period; }
    public void setPeriod(final TrainingPeriod period) { this.period = period; }
    public List<TrainingAttendance> getAttendances() { return attendances; }
    public void setAttendances(final List<TrainingAttendance> attendances) { this.attendances = attendances; }
}
