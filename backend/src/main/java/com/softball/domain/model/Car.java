package com.softball.domain.model;

public class Car {
    private Long id;
    private GameDay gameDay;
    private Player driver;
    private Integer totalSeats;
    private String direction;

    public Car() {}

    public Car(final GameDay gameDay, final Player driver, final Integer totalSeats, final String direction) {
        this.gameDay = gameDay;
        this.driver = driver;
        this.totalSeats = totalSeats;
        this.direction = direction;
    }

    public Car(final Long id, final GameDay gameDay, final Player driver, final Integer totalSeats, final String direction) {
        this.id = id;
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
