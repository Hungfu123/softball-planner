package com.softball.adapter.out.persistence.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.Formula;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "games")
public class GameEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Min(1) @Max(10)
    @Column(nullable = false)
    private Integer gameNumber;

    @Formula("(SELECT COUNT(*) FROM lineup_entries le WHERE le.game_id = id)")
    private int lineupEntryCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opponent_team_id")
    private LeagueTeamEntity opponentTeam;

    private Integer scoreUs;

    private Integer scoreThem;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "batting_side", length = 10)
    private String battingSide;

    @Enumerated(EnumType.STRING)
    @Column(name = "first_base_coach_rotation", length = 20)
    private com.softball.domain.model.CoachRotationPair firstBaseCoachRotation;

    @Enumerated(EnumType.STRING)
    @Column(name = "third_base_coach_rotation", length = 20)
    private com.softball.domain.model.CoachRotationPair thirdBaseCoachRotation;

    @Column(name = "first_base_coach_rotation_reversed", nullable = false)
    private boolean firstBaseCoachRotationReversed;

    @Column(name = "third_base_coach_rotation_reversed", nullable = false)
    private boolean thirdBaseCoachRotationReversed;

    // Spielzeit-Uhr. Pausierbar, deshalb zwei Felder statt eines Startzeitpunkts:
    // timerAccumulatedSeconds haelt die Zeit vor der laufenden Phase, timerRunningSince den
    // Beginn der laufenden. NULL = pausiert oder nie gestartet.
    @Column(name = "timer_running_since")
    private Instant timerRunningSince;

    @Column(name = "timer_accumulated_seconds", nullable = false)
    private int timerAccumulatedSeconds;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    // Der tatsaechliche Spielbeginn — getrennt von timerRunningSince, das nach einer Pause den
    // letzten Resume zeigt statt des ersten Starts. Wird nur beim allerersten Start gesetzt
    // (siehe GameClockService), nie ueberschrieben.
    @Column(name = "timer_started_at")
    private Instant timerStartedAt;

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
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(final Instant endedAt) { this.endedAt = endedAt; }
    public String getBattingSide() { return battingSide; }
    public void setBattingSide(final String battingSide) { this.battingSide = battingSide; }
    public com.softball.domain.model.CoachRotationPair getFirstBaseCoachRotation() { return firstBaseCoachRotation; }
    public void setFirstBaseCoachRotation(final com.softball.domain.model.CoachRotationPair v) { this.firstBaseCoachRotation = v; }
    public com.softball.domain.model.CoachRotationPair getThirdBaseCoachRotation() { return thirdBaseCoachRotation; }
    public void setThirdBaseCoachRotation(final com.softball.domain.model.CoachRotationPair v) { this.thirdBaseCoachRotation = v; }
    public boolean isFirstBaseCoachRotationReversed() { return firstBaseCoachRotationReversed; }
    public void setFirstBaseCoachRotationReversed(final boolean v) { this.firstBaseCoachRotationReversed = v; }
    public boolean isThirdBaseCoachRotationReversed() { return thirdBaseCoachRotationReversed; }
    public void setThirdBaseCoachRotationReversed(final boolean v) { this.thirdBaseCoachRotationReversed = v; }
    public Instant getTimerRunningSince() { return timerRunningSince; }
    public void setTimerRunningSince(final Instant timerRunningSince) { this.timerRunningSince = timerRunningSince; }
    public int getTimerAccumulatedSeconds() { return timerAccumulatedSeconds; }
    public void setTimerAccumulatedSeconds(final int timerAccumulatedSeconds) { this.timerAccumulatedSeconds = timerAccumulatedSeconds; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(final Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Instant getTimerStartedAt() { return timerStartedAt; }
    public void setTimerStartedAt(final Instant timerStartedAt) { this.timerStartedAt = timerStartedAt; }
}
