package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "training_periods")
public class TrainingPeriodEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private String name;

    @NotNull
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @NotNull
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "weekdays")
    private String weekdays;

    @Column(name = "time")
    private String time;

    @Column(name = "location")
    private String location;

    @Column(name = "weekday_times")
    private String weekdayTimes;

    public TrainingPeriodEntity() {}

    public TrainingPeriodEntity(final String name, final LocalDate startDate, final LocalDate endDate) {
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

    public String getWeekdays() { return weekdays; }
    public void setWeekdays(final String weekdays) { this.weekdays = weekdays; }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }

    public String getWeekdayTimes() { return weekdayTimes; }
    public void setWeekdayTimes(final String weekdayTimes) { this.weekdayTimes = weekdayTimes; }
}
