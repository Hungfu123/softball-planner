package com.softball.domain.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.domain.model.Drill;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstest mit dem echten drills.json Katalog.
 * Prüft realistische Trainingsszenarien.
 */
class TrainingPlanGeneratorIntegrationTest {

    private TrainingPlanGenerator generator;
    private List<Drill> realCatalog;

    @BeforeEach
    void setUp() throws Exception {
        generator = new TrainingPlanGenerator();
        final ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = getClass().getResourceAsStream("/drills.json")) {
            realCatalog = mapper.readValue(is, new TypeReference<>() {});
        }
    }

    @Test
    void realistisches_120min_infield_defense_10_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 10, "INFIELD_DEFENSE", 120);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 120 min | INFIELD_DEFENSE | 10 Spieler ===");
        printPlan(sections);

        // Grundstruktur: Warmup → Drills → Batting (kein Spiel bei 10 Spielern)
        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        assertThat(sections.stream().noneMatch(s -> "GAME".equals(s.getSectionType()))).isTrue();
        assertThat(sections.stream().anyMatch(s -> "BATTING".equals(s.getSectionType()))).isTrue();

        // Grundlagen sequentiell + Positions-Drills als Stationen
        final List<TrainingPlanSection> drills = sections.stream()
                .filter(s -> "DRILL".equals(s.getSectionType())).toList();
        assertThat(drills).isNotEmpty();

        // Sequentielle Grundlagen (kein parallelGroup)
        assertThat(drills.stream().anyMatch(s -> s.getParallelGroup() == null)).isTrue();
        // Stationsblock mit Positions-Drills (parallelGroup gesetzt)
        assertThat(drills.stream().anyMatch(s -> s.getParallelGroup() != null)).isTrue();
    }

    @Test
    void realistisches_120min_infield_defense_16_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 16, "INFIELD_DEFENSE", 120);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 120 min | INFIELD_DEFENSE | 16 Spieler ===");
        printPlan(sections);

        // 120 min → kein Spiel (erst ab 150 min), dafür mehr Drill-Zeit
        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        assertThat(sections.stream().noneMatch(s -> "GAME".equals(s.getSectionType()))).isTrue();
        assertThat(sections.stream().anyMatch(s -> "BATTING".equals(s.getSectionType()))).isTrue();
        assertThat(sections.stream().anyMatch(s -> "DRILL".equals(s.getSectionType()))).isTrue();
        assertThat(sections.stream().anyMatch(s -> "BREAK".equals(s.getSectionType()))).isTrue();
    }

    @Test
    void realistisches_120min_werfen_12_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 12, "WERFEN", 120);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 120 min | WERFEN | 12 Spieler ===");
        printPlan(sections);

        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        // 12 Spieler < 14 → kein Spiel
        assertThat(sections.stream().noneMatch(s -> "GAME".equals(s.getSectionType()))).isTrue();

        // Drills nur THROWING-Kategorie (keine Infield-Position)
        final List<String> drillIds = sections.stream()
                .filter(s -> "DRILL".equals(s.getSectionType()))
                .map(TrainingPlanSection::getDrillId).toList();
        assertThat(drillIds).isNotEmpty();
    }

    @Test
    void realistisches_90min_outfield_10_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 10, "OUTFIELD", 90);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 90 min | OUTFIELD | 10 Spieler ===");
        printPlan(sections);

        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        // 10 < 14 → kein Spiel
        assertThat(sections.stream().noneMatch(s -> "GAME".equals(s.getSectionType()))).isTrue();
    }

    @Test
    void realistisches_180min_allround_20_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 20, "ALLROUND", 180);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 180 min | ALLROUND | 20 Spieler ===");
        printPlan(sections);

        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        // 20 >= 14 und 180 >= 120 → Spiel
        assertThat(sections.get(sections.size() - 1).getSectionType()).isEqualTo("GAME");
    }

    @Test
    void realistisches_120min_multi_focus_16_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 16, "INFIELD_DEFENSE,OUTFIELD", 120);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 120 min | INFIELD_DEFENSE,OUTFIELD | 16 Spieler ===");
        printPlan(sections);

        // Drills aus beiden Fokussen, keine Duplikate
        final List<String> drillIds = sections.stream()
                .filter(s -> "DRILL".equals(s.getSectionType()))
                .map(TrainingPlanSection::getDrillId).toList();
        assertThat(drillIds).doesNotHaveDuplicates();
    }

    @Test
    void realistisches_60min_situational_8_spieler() {
        final TrainingPlanContent result = generator.generate(realCatalog, 8, "SITUATIONAL", 60);

        final List<TrainingPlanSection> sections = result.getSections();
        System.out.println("\n=== 60 min | SITUATIONAL | 8 Spieler ===");
        printPlan(sections);

        assertThat(sections.get(0).getSectionType()).isEqualTo("WARMUP");
        // 60 min → kein Spiel
        assertThat(sections.stream().noneMatch(s -> "GAME".equals(s.getSectionType()))).isTrue();
    }

    private void printPlan(final List<TrainingPlanSection> sections) {
        int startMin = 0;
        for (final TrainingPlanSection s : sections) {
            final String parallel = s.getParallelGroup() != null ? " [Gruppe " + s.getParallelGroup() + "]" : "";
            final String group = s.getGroupSetup() != null ? " (" + s.getGroupSetup() + ")" : "";
            System.out.printf("  %3d-%3d min | %-8s | %s%s%s%n",
                    startMin, startMin + s.getDurationMinutes(),
                    s.getSectionType(), s.getTitle(), parallel, group);
            if (s.getParallelGroup() == null) {
                startMin += s.getDurationMinutes();
            }
        }
        System.out.printf("  Gesamt: %d min%n", startMin);
    }
}
