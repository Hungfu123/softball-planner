package com.softball.domain.model;

/**
 * Ein Stand: vollstaendiger Schnappschuss des Feldes zu einem Zeitpunkt.
 *
 * {@code ordinal} laeuft lueckenlos von 1 bis N. {@code durationMs} ist die Dauer des
 * Uebergangs ZU diesem Stand, nicht die Verweildauer darin.
 */
public class PlayStep {

    private Long id;
    private int ordinal;
    private int durationMs;
    private String note;
    private int outs;
    private PlayMarkers markers;

    public PlayStep() {}

    public PlayStep(final Long id, final int ordinal, final int durationMs, final String note,
                    final int outs, final PlayMarkers markers) {
        this.id = id;
        this.ordinal = ordinal;
        this.durationMs = durationMs;
        this.note = note;
        this.outs = outs;
        this.markers = markers;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public int getOrdinal() { return ordinal; }
    public void setOrdinal(final int ordinal) { this.ordinal = ordinal; }

    public int getDurationMs() { return durationMs; }
    public void setDurationMs(final int durationMs) { this.durationMs = durationMs; }

    public String getNote() { return note; }
    public void setNote(final String note) { this.note = note; }

    public int getOuts() { return outs; }
    public void setOuts(final int outs) { this.outs = outs; }

    public PlayMarkers getMarkers() { return markers; }
    public void setMarkers(final PlayMarkers markers) { this.markers = markers; }
}
