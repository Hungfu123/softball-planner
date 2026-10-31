package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.PlayCategoryEntity;
import com.softball.adapter.out.persistence.entity.PlayEntity;
import com.softball.adapter.out.persistence.entity.PlayStepEntity;
import com.softball.domain.model.GameState;
import com.softball.domain.model.Play;
import com.softball.domain.model.PlayCategory;
import com.softball.domain.model.PlayMarkers;
import com.softball.domain.model.PlayStep;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class PlayMapper {

    private final ObjectMapper json;

    public PlayMapper(final ObjectMapper json) {
        this.json = json;
    }

    public Play toDomain(final PlayEntity entity) {
        final Play play = new Play();
        play.setId(entity.getId());
        play.setTitle(entity.getTitle());
        play.setCategoryId(entity.getCategoryId());
        play.setGameState(GameState.valueOf(entity.getGameState()));
        play.setGameStateNote(entity.getGameStateNote());
        play.setCounterpartPlayId(entity.getCounterpartPlayId());
        play.setSortOrder(entity.getSortOrder());
        play.setCreatedAt(entity.getCreatedAt());
        play.setUpdatedAt(entity.getUpdatedAt());
        final List<PlayStep> steps = new ArrayList<>();
        for (final PlayStepEntity step : entity.getSteps()) {
            steps.add(new PlayStep(step.getId(), step.getOrdinal(), step.getDurationMs(),
                    step.getNote(), step.getOuts(), readMarkers(step.getMarkers())));
        }
        play.setSteps(steps);
        return play;
    }

    /** Nur die Kopfdaten. Die Staende ersetzt {@link #replaceSteps} in einem eigenen Schritt. */
    public void updateScalars(final PlayEntity entity, final Play play) {
        entity.setTitle(play.getTitle());
        entity.setCategoryId(play.getCategoryId());
        entity.setGameState(play.getGameState().name());
        entity.setGameStateNote(play.getGameStateNote());
        entity.setCounterpartPlayId(play.getCounterpartPlayId());
        /*
         * `sortOrder` steht hier ABSICHTLICH nicht.
         *
         * Es ist Redaktion, keine Eingabe: der Platz im Kapitel kommt aus der Migration,
         * und kein Formular setzt ihn. Stuende er hier, wuerde jedes Speichern im Editor
         * ihn auf NULL ziehen, weil die Anfrage ihn nicht mitbringt — und das Play
         * ruckelte stillschweigend ans Kapitelende.
         */
    }

    /**
     * Baut die Staende neu auf.
     *
     * Das PUT ersetzt immer alle Staende — der Editor haelt ohnehin das ganze Play. Das
     * Leeren und das Neubefuellen muessen allerdings in zwei Spuelungen laufen: in einer
     * einzigen fuegt Hibernate den neuen Stand mit ordinal 1 ein, bevor es den alten
     * loescht, und der eindeutige Index (play_id, ordinal) schlaegt zu. Deshalb ruft der
     * Adapter erst {@link #clearSteps}, spuelt, und dann diese Methode.
     */
    public void replaceSteps(final PlayEntity entity, final Play play) {
        for (final PlayStep step : play.getSteps()) {
            final PlayStepEntity stepEntity = new PlayStepEntity();
            stepEntity.setPlay(entity);
            stepEntity.setOrdinal(step.getOrdinal());
            stepEntity.setDurationMs(step.getDurationMs());
            stepEntity.setNote(step.getNote());
            stepEntity.setOuts((short) step.getOuts());
            stepEntity.setMarkers(writeMarkers(step.getMarkers()));
            entity.getSteps().add(stepEntity);
        }
    }

    public void clearSteps(final PlayEntity entity) {
        entity.getSteps().clear();
    }

    public PlayCategory toDomain(final PlayCategoryEntity entity) {
        return new PlayCategory(entity.getId(), entity.getName(), entity.getSortOrder());
    }

    public void updateEntity(final PlayCategoryEntity entity, final PlayCategory category) {
        entity.setName(category.getName());
        entity.setSortOrder(category.getSortOrder());
    }

    private PlayMarkers readMarkers(final String raw) {
        try {
            return json.readValue(raw, PlayMarkers.class);
        } catch (final JsonProcessingException e) {
            throw new IllegalStateException("Marker eines Stands sind kein gueltiges JSON", e);
        }
    }

    private String writeMarkers(final PlayMarkers markers) {
        try {
            return json.writeValueAsString(markers);
        } catch (final JsonProcessingException e) {
            throw new IllegalStateException("Marker eines Stands lassen sich nicht serialisieren", e);
        }
    }
}
