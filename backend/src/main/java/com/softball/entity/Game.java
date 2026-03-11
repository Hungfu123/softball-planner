package com.softball.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "games")
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Min(1) @Max(3)
    @Column(nullable = false)
    private Integer gameNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "opponent_team_id")
    private LeagueTeam opponentTeam;

    private Integer scoreUs;

    private Integer scoreThem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_day_id", nullable = false)
    @JsonIgnore
    private GameDay gameDay;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("battingOrder ASC")
    private List<LineupEntry> lineupEntries = new ArrayList<>();

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GameStaff> staff = new ArrayList<>();

    public Game() {}

    public Game(Integer gameNumber, GameDay gameDay) {
        this.gameNumber = gameNumber;
        this.gameDay = gameDay;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(Integer gameNumber) { this.gameNumber = gameNumber; }
    public GameDay getGameDay() { return gameDay; }
    public void setGameDay(GameDay gameDay) { this.gameDay = gameDay; }
    public List<LineupEntry> getLineupEntries() { return lineupEntries; }
    public void setLineupEntries(List<LineupEntry> lineupEntries) { this.lineupEntries = lineupEntries; }
    public LeagueTeam getOpponentTeam() { return opponentTeam; }
    public void setOpponentTeam(final LeagueTeam opponentTeam) { this.opponentTeam = opponentTeam; }
    public Integer getScoreUs() { return scoreUs; }
    public void setScoreUs(final Integer scoreUs) { this.scoreUs = scoreUs; }
    public Integer getScoreThem() { return scoreThem; }
    public void setScoreThem(final Integer scoreThem) { this.scoreThem = scoreThem; }
    public List<GameStaff> getStaff() { return staff; }
    public void setStaff(List<GameStaff> staff) { this.staff = staff; }
    public Long getGameDayId() { return gameDay != null ? gameDay.getId() : null; }
}
