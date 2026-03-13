package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.Formula;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "games")
public class GameEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Min(1) @Max(3)
    @Column(nullable = false)
    private Integer gameNumber;

    @Formula("(SELECT COUNT(*) FROM lineup_entries le WHERE le.game_id = id)")
    private int lineupEntryCount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "opponent_team_id")
    private LeagueTeamEntity opponentTeam;

    private Integer scoreUs;

    private Integer scoreThem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_day_id", nullable = false)
    @JsonIgnore
    private GameDayEntity gameDay;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("battingOrder ASC")
    private List<LineupEntryEntity> lineupEntries = new ArrayList<>();

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GameStaffEntity> staff = new ArrayList<>();

    public GameEntity() {}

    public GameEntity(Integer gameNumber, GameDayEntity gameDay) {
        this.gameNumber = gameNumber;
        this.gameDay = gameDay;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(Integer gameNumber) { this.gameNumber = gameNumber; }
    public GameDayEntity getGameDay() { return gameDay; }
    public void setGameDay(GameDayEntity gameDay) { this.gameDay = gameDay; }
    public List<LineupEntryEntity> getLineupEntries() { return lineupEntries; }
    public void setLineupEntries(List<LineupEntryEntity> lineupEntries) { this.lineupEntries = lineupEntries; }
    public LeagueTeamEntity getOpponentTeam() { return opponentTeam; }
    public void setOpponentTeam(final LeagueTeamEntity opponentTeam) { this.opponentTeam = opponentTeam; }
    public Integer getScoreUs() { return scoreUs; }
    public void setScoreUs(final Integer scoreUs) { this.scoreUs = scoreUs; }
    public Integer getScoreThem() { return scoreThem; }
    public void setScoreThem(final Integer scoreThem) { this.scoreThem = scoreThem; }
    public List<GameStaffEntity> getStaff() { return staff; }
    public void setStaff(List<GameStaffEntity> staff) { this.staff = staff; }
    public int getLineupEntryCount() { return lineupEntryCount; }
    public Long getGameDayId() { return gameDay != null ? gameDay.getId() : null; }
}
