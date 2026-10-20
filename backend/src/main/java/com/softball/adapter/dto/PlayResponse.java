package com.softball.adapter.dto;

import com.softball.domain.model.GameState;
import com.softball.domain.model.Play;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Vollstaendig, mit allen Staenden — auch in der Liste.
 *
 * Die Uebersicht braucht den ersten Stand jedes Plays fuer die Vorschau, und ein einziger
 * Listenaufruf waermt damit den Offline-Cache fuer jedes Play, auch fuer die, die noch
 * niemand geoeffnet hat.
 */
public record PlayResponse(Long id, String title, Long categoryId, GameState gameState,
                           String gameStateNote, Long counterpartPlayId,
                           List<PlayStepResponse> steps,
                           LocalDateTime createdAt, LocalDateTime updatedAt) {

    public static PlayResponse from(final Play play) {
        return new PlayResponse(play.getId(), play.getTitle(), play.getCategoryId(),
                play.getGameState(), play.getGameStateNote(), play.getCounterpartPlayId(),
                play.getSteps().stream().map(PlayStepResponse::from).toList(),
                play.getCreatedAt(), play.getUpdatedAt());
    }
}
