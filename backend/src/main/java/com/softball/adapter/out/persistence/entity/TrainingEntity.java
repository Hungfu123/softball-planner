package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trainings")
public class TrainingEntity {

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

    @Column(name = "open_to_all", nullable = false)
    private boolean openToAll = true;

    // EAGER: TrainingMapper.toDomain dereferenziert period bei JEDEM Mapping. Bei LAZY warf das
    // Mapping außerhalb einer offenen Session (z.B. WhatsappPollScheduler-Thread, kein OSIV) eine
    // LazyInitializationException. period ist ein kleines ToOne → Eager-Join ist billig.
    // EAGER: TrainingMapper.toDomain dereferenziert period bei JEDEM Mapping. Bei LAZY warf das
    // Mapping außerhalb einer offenen Session (z.B. WhatsappPollScheduler-Thread, kein OSIV) eine
    // LazyInitializationException. period ist ein kleines ToOne → Eager-Join ist billig.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "period_id")
    private TrainingPeriodEntity period;

    @OneToMany(mappedBy = "training", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TrainingAttendanceEntity> attendances = new ArrayList<>();

    public TrainingEntity() {}

    public TrainingEntity(final LocalDate date, final String time, final String location) {
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
    public TrainingPeriodEntity getPeriod() { return period; }
    public void setPeriod(final TrainingPeriodEntity period) { this.period = period; }
    public boolean isOpenToAll() { return openToAll; }
    public void setOpenToAll(final boolean openToAll) { this.openToAll = openToAll; }
    public String getType() { return type; }
    public void setType(final String type) { this.type = type; }
    public List<TrainingAttendanceEntity> getAttendances() { return attendances; }
    public void setAttendances(final List<TrainingAttendanceEntity> attendances) { this.attendances = attendances; }
}
