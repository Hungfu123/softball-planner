package com.softball.application;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;
import com.softball.domain.port.out.DrillCatalogPort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DrillService {

    private static final Map<String, List<DrillCategory>> FOCUS_CATEGORY_MAP = Map.ofEntries(
        Map.entry("WERFEN", List.of(DrillCategory.THROWING)),
        Map.entry("INFIELD_DEFENSE", List.of(DrillCategory.FIRST_BASE, DrillCategory.SECOND_BASE, DrillCategory.SS,
                DrillCategory.THIRD_BASE, DrillCategory.DOUBLE_PLAY, DrillCategory.BUNT_DEFENSE)),
        Map.entry("OUTFIELD", List.of(DrillCategory.OUTFIELD)),
        Map.entry("BASERUNNING", List.of(DrillCategory.BASERUNNING, DrillCategory.CONDITIONING)),
        Map.entry("SITUATIONAL", List.of(DrillCategory.SITUATIONAL, DrillCategory.DOUBLE_PLAY, DrillCategory.BUNT_DEFENSE,
                DrillCategory.COMINGS)),
        Map.entry("CATCHER", List.of(DrillCategory.CATCHER, DrillCategory.COMINGS)),
        Map.entry("RELAY", List.of(DrillCategory.RELAY)),
        Map.entry("ALLROUND", List.of(DrillCategory.values()))
    );

    private static final List<DrillCategory> ALWAYS_INCLUDED = List.of(DrillCategory.WARMUP, DrillCategory.HITTING);

    private final DrillCatalogPort drillCatalog;

    public DrillService(final DrillCatalogPort drillCatalog) {
        this.drillCatalog = drillCatalog;
    }

    public List<Drill> findAll() {
        return drillCatalog.findAll();
    }

    public Optional<Drill> findById(final String id) {
        return drillCatalog.findById(id);
    }

    public List<Drill> findFiltered(final String focus, final int maxPlayers) {
        // focus kann komma-separiert sein: "WERFEN,INFIELD_DEFENSE"
        final List<DrillCategory> allCategories = new ArrayList<>();
        for (final String singleFocus : focus.split(",")) {
            final List<DrillCategory> cats = FOCUS_CATEGORY_MAP.getOrDefault(
                    singleFocus.trim().toUpperCase(), List.of());
            for (final DrillCategory cat : cats) {
                if (!allCategories.contains(cat)) {
                    allCategories.add(cat);
                }
            }
        }
        if (allCategories.isEmpty()) {
            allCategories.addAll(List.of(DrillCategory.values()));
        }
        for (final DrillCategory always : ALWAYS_INCLUDED) {
            if (!allCategories.contains(always)) {
                allCategories.add(always);
            }
        }

        return drillCatalog.findByCategories(allCategories, maxPlayers);
    }

    public List<Drill> filterByFocus(final String focus, final int playerCount) {
        return findFiltered(focus, playerCount);
    }
}
