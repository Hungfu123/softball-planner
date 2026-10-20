package com.softball.application;

import com.softball.adapter.dto.PlayCategoryRequest;
import com.softball.domain.model.PlayCategory;
import com.softball.domain.port.out.PlayCategoryRepository;
import com.softball.domain.port.out.PlayRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlayCategoryService {

    private static final Logger log = LoggerFactory.getLogger(PlayCategoryService.class);

    private final PlayCategoryRepository categories;
    private final PlayRepository plays;

    public PlayCategoryService(final PlayCategoryRepository categories, final PlayRepository plays) {
        this.categories = categories;
        this.plays = plays;
    }

    @Transactional(readOnly = true)
    public List<PlayCategory> findAll() {
        return categories.findAll();
    }

    @Transactional
    public PlayCategory create(final PlayCategoryRequest request) {
        requireFreeName(request.name(), null);
        final PlayCategory category = new PlayCategory(null, request.name().trim(),
                request.sortOrder() == null ? naechsteSortierung() : request.sortOrder());
        final PlayCategory saved = categories.save(category);
        log.info("Play-Kategorie angelegt: {}", saved.getName());
        return saved;
    }

    @Transactional
    public PlayCategory rename(final Long id, final PlayCategoryRequest request) {
        final PlayCategory category = categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategorie nicht gefunden: " + id));
        requireFreeName(request.name(), id);
        category.setName(request.name().trim());
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        final PlayCategory saved = categories.save(category);
        log.info("Play-Kategorie umbenannt: id={} -> {}", id, saved.getName());
        return saved;
    }

    /** Haengt alle Plays um und loescht die Quelle. */
    @Transactional
    public void merge(final Long fromId, final Long toId) {
        if (fromId.equals(toId)) {
            throw new BusinessValidationException("Eine Kategorie laesst sich nicht mit sich selbst zusammenfuehren.");
        }
        categories.findById(fromId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategorie nicht gefunden: " + fromId));
        categories.findById(toId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategorie nicht gefunden: " + toId));

        final int bewegt = plays.moveToCategory(fromId, toId);
        categories.deleteById(fromId);
        log.info("Play-Kategorien zusammengefuehrt: {} -> {} ({} Plays)", fromId, toId, bewegt);
    }

    @Transactional
    public void delete(final Long id) {
        final PlayCategory category = categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategorie nicht gefunden: " + id));
        if (plays.existsByCategoryId(id)) {
            throw new BusinessValidationException(
                    "In der Kategorie \"" + category.getName() + "\" liegen noch Plays. "
                            + "Erst zusammenfuehren oder die Plays umhaengen.");
        }
        categories.deleteById(id);
        log.info("Play-Kategorie geloescht: {}", category.getName());
    }

    private void requireFreeName(final String name, final Long eigeneId) {
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("Die Kategorie braucht einen Namen.");
        }
        categories.findByNameIgnoreCase(name.trim()).ifPresent(vorhanden -> {
            if (!vorhanden.getId().equals(eigeneId)) {
                throw new BusinessValidationException(
                        "Es gibt schon eine Kategorie \"" + vorhanden.getName() + "\".");
            }
        });
    }

    private int naechsteSortierung() {
        return categories.findAll().stream().mapToInt(PlayCategory::getSortOrder).max().orElse(0) + 10;
    }
}
