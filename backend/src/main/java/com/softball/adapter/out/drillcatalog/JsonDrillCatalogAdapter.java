package com.softball.adapter.out.drillcatalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;
import com.softball.domain.port.out.DrillCatalogPort;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class JsonDrillCatalogAdapter implements DrillCatalogPort {

    private final ObjectMapper objectMapper;
    private List<Drill> drills = Collections.emptyList();

    public JsonDrillCatalogAdapter(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void loadDrills() throws IOException {
        try (InputStream is = new ClassPathResource("drills.json").getInputStream()) {
            drills = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    @Override
    public List<Drill> findAll() {
        return Collections.unmodifiableList(drills);
    }

    @Override
    public Optional<Drill> findById(final String id) {
        return drills.stream()
                .filter(d -> d.getId().equals(id))
                .findFirst();
    }

    @Override
    public List<Drill> findByCategories(final List<DrillCategory> categories, final int maxPlayers) {
        return drills.stream()
                .filter(d -> d.getMinPlayers() <= maxPlayers)
                .filter(d -> d.getCategories().stream().anyMatch(categories::contains))
                .toList();
    }
}
