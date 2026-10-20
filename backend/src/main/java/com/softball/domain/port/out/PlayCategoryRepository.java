package com.softball.domain.port.out;

import com.softball.domain.model.PlayCategory;

import java.util.List;
import java.util.Optional;

public interface PlayCategoryRepository {

    List<PlayCategory> findAll();

    Optional<PlayCategory> findById(Long id);

    /** Ohne Ruecksicht auf Gross- und Kleinschreibung — "Cutoff" und "cutoff" sind dieselbe. */
    Optional<PlayCategory> findByNameIgnoreCase(String name);

    PlayCategory save(PlayCategory category);

    void deleteById(Long id);
}
