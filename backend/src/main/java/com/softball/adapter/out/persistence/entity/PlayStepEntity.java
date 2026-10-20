package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "play_step")
public class PlayStepEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "play_id", nullable = false)
    private PlayEntity play;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "duration_ms", nullable = false)
    private int durationMs;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "outs", nullable = false)
    private short outs;

    /**
     * Die Marker eines Stands als JSON-Dokument. Neun Verteidiger, bis zu vier Runner und
     * ein Ball werden immer zusammen gelesen und geschrieben — einzelne Marker fragt
     * niemand ab. Umgewandelt wird im Mapper, wie bei TrainingPlanEntity.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "markers", columnDefinition = "jsonb", nullable = false)
    private String markers;

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public PlayEntity getPlay() { return play; }
    public void setPlay(final PlayEntity play) { this.play = play; }

    public int getOrdinal() { return ordinal; }
    public void setOrdinal(final int ordinal) { this.ordinal = ordinal; }

    public int getDurationMs() { return durationMs; }
    public void setDurationMs(final int durationMs) { this.durationMs = durationMs; }

    public String getNote() { return note; }
    public void setNote(final String note) { this.note = note; }

    public short getOuts() { return outs; }
    public void setOuts(final short outs) { this.outs = outs; }

    public String getMarkers() { return markers; }
    public void setMarkers(final String markers) { this.markers = markers; }
}
