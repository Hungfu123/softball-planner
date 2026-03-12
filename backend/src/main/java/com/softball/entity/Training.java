package com.softball.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trainings")
public class Training {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    private String time;

    private String location;

    @Column(nullable = false)
    private boolean cancelled = false;

    @Column(nullable = false)
    private String type = "REGULAR";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id")
    private TrainingPeriod period;

    @OneToMany(mappedBy = "training", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TrainingAttendance> attendances = new ArrayList<>();

    public Training() {}

    public Training(final LocalDate date, final String time, final String location) {
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
    public TrainingPeriod getPeriod() { return period; }
    public void setPeriod(final TrainingPeriod period) { this.period = period; }
    public String getType() { return type; }
    public void setType(final String type) { this.type = type; }
    public List<TrainingAttendance> getAttendances() { return attendances; }
    public void setAttendances(final List<TrainingAttendance> attendances) { this.attendances = attendances; }
}
