package com.softball.domain.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Eine gespeicherte Spielsituation als Folge von Staenden.
 *
 * Die Ausgangslage — wer auf welcher Base steht, wie viele Outs — ist kein eigenes Feld.
 * Sie ist der erste Stand. Die Uebersicht leitet Vorschau und Beschreibung daraus ab.
 */
public class Play {

    private Long id;
    private String title;
    private Long categoryId;
    private GameState gameState = GameState.ANY;
    private String gameStateNote;
    /** Dasselbe Spielbild in anderer Lage. Einseitig: wer verknuepft, verknuepft von hier aus. */
    private Long counterpartPlayId;
    private List<PlayStep> steps = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(final Long categoryId) { this.categoryId = categoryId; }

    public GameState getGameState() { return gameState; }
    public void setGameState(final GameState gameState) { this.gameState = gameState; }

    public String getGameStateNote() { return gameStateNote; }
    public void setGameStateNote(final String gameStateNote) { this.gameStateNote = gameStateNote; }

    public Long getCounterpartPlayId() { return counterpartPlayId; }
    public void setCounterpartPlayId(final Long counterpartPlayId) { this.counterpartPlayId = counterpartPlayId; }

    public List<PlayStep> getSteps() { return steps; }
    public void setSteps(final List<PlayStep> steps) { this.steps = steps; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
