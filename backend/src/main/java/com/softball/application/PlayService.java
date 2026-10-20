package com.softball.application;

import com.softball.adapter.dto.PlayRequest;
import com.softball.domain.model.GameState;
import com.softball.domain.model.Play;
import com.softball.domain.model.PlayStep;
import com.softball.domain.port.out.PlayCategoryRepository;
import com.softball.domain.port.out.PlayRepository;
import com.softball.domain.service.PlayValidator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class PlayService {

    private static final Logger log = LoggerFactory.getLogger(PlayService.class);

    private final PlayRepository plays;
    private final PlayCategoryRepository categories;
    /** Domain-Service, kein Bean — wie LineupValidator im Rest des Projekts. */
    private final PlayValidator validator = new PlayValidator();

    public PlayService(final PlayRepository plays, final PlayCategoryRepository categories) {
        this.plays = plays;
        this.categories = categories;
    }

    @Transactional(readOnly = true)
    public List<Play> findAll(final Long categoryId) {
        return categoryId == null ? plays.findAll() : plays.findByCategoryId(categoryId);
    }

    @Transactional(readOnly = true)
    public Play findById(final Long id) {
        return plays.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Play nicht gefunden: " + id));
    }

    @Transactional
    public Play create(final PlayRequest request) {
        final Play play = toDomain(null, request);
        validator.validate(play);
        final Play saved = plays.save(play);
        log.info("Play angelegt: {} (id={}, {} Staende)", saved.getTitle(), saved.getId(),
                saved.getSteps().size());
        return saved;
    }

    @Transactional
    public Play update(final Long id, final PlayRequest request) {
        findById(id);
        final Play play = toDomain(id, request);
        validator.validate(play);
        final Play saved = plays.save(play);
        log.info("Play geaendert: {} (id={}, {} Staende)", saved.getTitle(), saved.getId(),
                saved.getSteps().size());
        return saved;
    }

    @Transactional
    public void delete(final Long id) {
        final Play play = findById(id);
        plays.deleteById(id);
        log.info("Play geloescht: {} (id={})", play.getTitle(), id);
    }

    /** Kopiert ein Play samt Staenden. Das Gegenstueck wird NICHT mitkopiert. */
    @Transactional
    public Play duplicate(final Long id) {
        final Play original = findById(id);
        final Play kopie = new Play();
        kopie.setTitle(original.getTitle() + " (Kopie)");
        kopie.setCategoryId(original.getCategoryId());
        kopie.setGameState(original.getGameState());
        kopie.setGameStateNote(original.getGameStateNote());
        final List<PlayStep> steps = new ArrayList<>();
        for (final PlayStep step : original.getSteps()) {
            steps.add(new PlayStep(null, step.getOrdinal(), step.getDurationMs(), step.getNote(),
                    step.getOuts(), step.getMarkers()));
        }
        kopie.setSteps(steps);
        final Play saved = plays.save(kopie);
        log.info("Play dupliziert: {} -> id={}", original.getTitle(), saved.getId());
        return saved;
    }

    private Play toDomain(final Long id, final PlayRequest request) {
        if (categories.findById(request.categoryId()).isEmpty()) {
            throw new BusinessValidationException("Kategorie nicht gefunden: " + request.categoryId());
        }
        final Play play = new Play();
        play.setId(id);
        play.setTitle(request.title());
        play.setCategoryId(request.categoryId());
        play.setGameState(request.gameState() == null ? GameState.ANY : request.gameState());
        play.setGameStateNote(request.gameStateNote());
        play.setCounterpartPlayId(request.counterpartPlayId());
        final List<PlayStep> steps = new ArrayList<>();
        request.steps().forEach(s -> steps.add(new PlayStep(null, s.ordinal(), s.durationMs(),
                s.note(), s.outs(), s.markers())));
        play.setSteps(steps);
        return play;
    }
}
