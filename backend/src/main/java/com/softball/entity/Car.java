package com.softball.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "cars", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"game_day_id", "driver_id"})
})
public class Car {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_day_id", nullable = false)
    @JsonIgnore
    private GameDay gameDay;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id", nullable = false)
    private Player driver;

    @NotNull
    @Min(2) @Max(9)
    @Column(nullable = false)
    private Integer totalSeats;

    @NotNull
    @Column(nullable = false)
    private String direction;

    public Car() {}

    public Car(final GameDay gameDay, final Player driver, final Integer totalSeats, final String direction) {
        this.gameDay = gameDay;
        this.driver = driver;
        this.totalSeats = totalSeats;
        this.direction = direction;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameDay getGameDay() { return gameDay; }
    public void setGameDay(final GameDay gameDay) { this.gameDay = gameDay; }
    public Player getDriver() { return driver; }
    public void setDriver(final Player driver) { this.driver = driver; }
    public Integer getTotalSeats() { return totalSeats; }
    public void setTotalSeats(final Integer totalSeats) { this.totalSeats = totalSeats; }
    public String getDirection() { return direction; }
    public void setDirection(final String direction) { this.direction = direction; }
    public Long getGameDayId() { return gameDay != null ? gameDay.getId() : null; }
}
