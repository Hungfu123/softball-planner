package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "game_days", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"season_id", "date"})
})
public class GameDayEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    private String label;

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    @JsonIgnore
    private SeasonEntity season;

    @ManyToMany
    @JoinTable(
        name = "game_day_players",
        joinColumns = @JoinColumn(name = "game_day_id"),
        inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    private Set<PlayerEntity> availablePlayers = new HashSet<>();

    @OneToMany(mappedBy = "gameDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("gameNumber ASC")
    private List<GameEntity> games = new ArrayList<>();

    @OneToMany(mappedBy = "gameDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<CarEntity> cars = new ArrayList<>();

    public GameDayEntity() {}

    public GameDayEntity(final LocalDate date, final String label, final String location, final SeasonEntity season) {
        this.date = date;
        this.label = label;
        this.location = location;
        this.season = season;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(final LocalDate date) { this.date = date; }
    public String getLabel() { return label; }
    public void setLabel(final String label) { this.label = label; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }
    public SeasonEntity getSeason() { return season; }
    public void setSeason(final SeasonEntity season) { this.season = season; }
    public Set<PlayerEntity> getAvailablePlayers() { return availablePlayers; }
    public void setAvailablePlayers(final Set<PlayerEntity> availablePlayers) { this.availablePlayers = availablePlayers; }
    public void setAvailablePlayersList(final List<PlayerEntity> players) { this.availablePlayers = new HashSet<>(players); }
    public List<GameEntity> getGames() { return games; }
    public void setGames(final List<GameEntity> games) { this.games = games; }
    public Long getSeasonId() { return season != null ? season.getId() : null; }
}
