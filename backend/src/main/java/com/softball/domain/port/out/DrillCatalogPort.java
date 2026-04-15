package com.softball.domain.port.out;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;

import java.util.List;
import java.util.Optional;

public interface DrillCatalogPort {
    List<Drill> findAll();
    Optional<Drill> findById(String id);
    List<Drill> findByCategories(List<DrillCategory> categories, int maxPlayers);
}
