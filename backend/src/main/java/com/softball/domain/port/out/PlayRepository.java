package com.softball.domain.port.out;

import com.softball.domain.model.Play;

import java.util.List;
import java.util.Optional;

public interface PlayRepository {

    /** Vollstaendig, mit allen Staenden — die Uebersicht braucht den ersten Stand jedes Plays. */
    List<Play> findAll();

    List<Play> findByCategoryId(Long categoryId);

    Optional<Play> findById(Long id);

    Play save(Play play);

    void deleteById(Long id);

    boolean existsByCategoryId(Long categoryId);

    /** Haengt alle Plays einer Kategorie auf eine andere um. Liefert die Anzahl. */
    int moveToCategory(Long fromCategoryId, Long toCategoryId);
}
