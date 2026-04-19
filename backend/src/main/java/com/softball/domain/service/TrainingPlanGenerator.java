package com.softball.domain.service;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Deterministischer Trainingsplan-Generator.
 * Erstellt einen Plan aus dem Drill-Katalog basierend auf Schwerpunkten, Spieleranzahl und Dauer.
 * Siehe docs/trainingsplan-algorithmus.md für die vollständige Dokumentation.
 */
public class TrainingPlanGenerator {

    private static final String WARMUP_DRILL_ID = "aufwarmroutine-dead-sox";
    private static final String HITTING_DRILL_ID = "hitting-stationen";
    private static final int WARMUP_MINUTES = 30;
    private static final int MIN_PLAYERS_FOR_GAME = 14;
    private static final int MIN_DURATION_FOR_GAME = 150;
    private static final int MIN_GAME_MINUTES = 20;
    private static final int MAX_GAME_MINUTES = 40;
    private static final int IDEAL_GROUP_SIZE = 4;
    private static final int MIN_PLAYERS_FOR_STATIONS = 8;
    private static final int MINUTES_PER_STATION_SMALL = 15;
    private static final int MINUTES_PER_STATION_LARGE = 20;
    private static final int LARGE_GROUP_THRESHOLD = 6;
    private static final int BASICS_DRILL_MINUTES = 10;
    private static final int MAX_BASICS_DRILLS = 2;
    private static final int MIN_DRILL_MINUTES = 10;
    private static final int BREAK_MINUTES = 5;
    private static final int OVERTIME_BUFFER = 5;

    private static final Map<String, List<DrillCategory>> FOCUS_CATEGORY_MAP = Map.ofEntries(
            Map.entry("WERFEN", List.of(DrillCategory.THROWING)),
            Map.entry("INFIELD_DEFENSE", List.of(DrillCategory.FIRST_BASE, DrillCategory.SECOND_BASE, DrillCategory.SS,
                    DrillCategory.THIRD_BASE, DrillCategory.DOUBLE_PLAY, DrillCategory.BUNT_DEFENSE, DrillCategory.THROWING)),
            Map.entry("OUTFIELD", List.of(DrillCategory.OUTFIELD, DrillCategory.THROWING)),
            Map.entry("BASERUNNING", List.of(DrillCategory.BASERUNNING, DrillCategory.CONDITIONING)),
            Map.entry("SITUATIONAL", List.of(DrillCategory.SITUATIONAL, DrillCategory.DOUBLE_PLAY, DrillCategory.BUNT_DEFENSE,
                    DrillCategory.COMINGS)),
            Map.entry("CATCHER", List.of(DrillCategory.CATCHER, DrillCategory.COMINGS, DrillCategory.THROWING)),
            Map.entry("RELAY", List.of(DrillCategory.RELAY)),
            Map.entry("ALLROUND", List.of(DrillCategory.values()))
    );

    public TrainingPlanContent generate(final List<Drill> allDrills, final int playerCount,
                                         final String focus, final int totalMinutes) {
        final List<TrainingPlanSection> sections = new ArrayList<>();
        int remainingMinutes = totalMinutes + OVERTIME_BUFFER;

        // --- SCHRITT 1: Aufwärmen + Trinkpause ---
        final Drill warmupDrill = findById(allDrills, WARMUP_DRILL_ID);
        if (warmupDrill != null) {
            sections.add(buildDrillSection(warmupDrill, "WARMUP", WARMUP_MINUTES, playerCount));
            sections.add(buildBreakSection("Trinken."));
            remainingMinutes -= WARMUP_MINUTES + BREAK_MINUTES;
        }

        // --- SCHRITT 2: Spiel reservieren ---
        int gameMinutes = 0;
        if (playerCount >= MIN_PLAYERS_FOR_GAME && totalMinutes >= MIN_DURATION_FOR_GAME) {
            gameMinutes = Math.min(MAX_GAME_MINUTES, Math.max(MIN_GAME_MINUTES, remainingMinutes / 5));
            remainingMinutes -= gameMinutes;
        }

        // --- Pausen reservieren: vor Batting + optional vor Spiel ---
        // Pause nach Warmup wird aus Drill-Zeit genommen (nur wenn genug Drill-Zeit vorhanden)
        final int reservedBreaks = 1 + (gameMinutes > 0 ? 1 : 0);
        remainingMinutes -= reservedBreaks * BREAK_MINUTES;

        // --- SCHRITT 3: Batting reservieren ---
        final int battingMinutes = calculateBattingMinutes(totalMinutes, remainingMinutes, playerCount);
        remainingMinutes -= battingMinutes;

        // --- SCHRITT 4: Drill-Phase ---
        final int drillSectionStartIdx = sections.size();
        final List<String> focuses = parseFocuses(focus);
        int parallelGroupCounter = 1;
        // Nach Warmup: Trinkpause (gehört zum Warmup-Block, nicht extra reserviert)
        int totalDrillMinutes = remainingMinutes;
        int usedDrillMinutes = 0;
        final Set<String> usedDrillIds = new HashSet<>();

        // Drill-Zeit gleichmäßig auf Schwerpunkte verteilen
        final int minutesPerFocus = focuses.isEmpty() ? 0 : totalDrillMinutes / focuses.size();

        for (int fi = 0; fi < focuses.size(); fi++) {
            final String singleFocus = focuses.get(fi);
            final List<Drill> focusDrills = filterDrillsForFocus(allDrills, singleFocus, playerCount).stream()
                    .filter(d -> !usedDrillIds.contains(d.getId()))
                    .toList();

            if (focusDrills.isEmpty()) {
                continue;
            }

            // Letzter Schwerpunkt bekommt den Rest
            int focusMinutes = (fi == focuses.size() - 1)
                    ? totalDrillMinutes - usedDrillMinutes
                    : minutesPerFocus;

            if (focusMinutes <= 0) {
                continue;
            }

            // Drills nach Level aufteilen: Grundlagen (Level 1) vs. Position/Simulation (Level 2+)
            final List<Drill> basics = new ArrayList<>(focusDrills.stream()
                    .filter(d -> drillLevel(d) == 1).toList());
            final List<Drill> advanced = new ArrayList<>(focusDrills.stream()
                    .filter(d -> drillLevel(d) >= 2).toList());
            Collections.shuffle(basics);
            Collections.shuffle(advanced);

            int focusUsed = 0;

            if (advanced.isEmpty()) {
                // --- Nur Grundlagen (z.B. WERFEN-Focus): alle Zeit für sequentielle Drills ---
                final List<TrainingPlanSection> seqDrills = buildSequentialDrills(
                        basics, playerCount, focusMinutes);
                sections.addAll(seqDrills);
                basics.forEach(d -> usedDrillIds.add(d.getId()));
                focusUsed += focusMinutes;
            } else {
                // Stationen berechnen — adaptiv: wenn 3 nicht passen, 2 probieren
                final boolean canDoStations = playerCount >= MIN_PLAYERS_FOR_STATIONS && advanced.size() >= 2;
                int stationCount = 0;
                int stationBlockMinutes = 0;
                int stationBreakNeeded = 0;
                int minutesPerStation = MINUTES_PER_STATION_SMALL;

                if (canDoStations) {
                    final int maxStations = playerCount >= 12 ? 3 : 2;
                    final int idealStations = Math.min(maxStations, Math.max(2, playerCount / IDEAL_GROUP_SIZE));

                    // Versuche mit idealStations, dann mit weniger falls es nicht passt
                    for (int tryStations = idealStations; tryStations >= 2; tryStations--) {
                        final int tryPlayersPerStation = (int) Math.ceil((double) playerCount / tryStations);
                        final int tryMinPerStation = tryPlayersPerStation >= LARGE_GROUP_THRESHOLD
                                ? MINUTES_PER_STATION_LARGE : MINUTES_PER_STATION_SMALL;
                        final int tryBlockMinutes = tryStations * tryMinPerStation;
                        final int tryBreak = tryStations >= 3 ? BREAK_MINUTES * 2 : BREAK_MINUTES;
                        final int tryTotal = tryBlockMinutes + tryBreak;

                        if (tryTotal <= focusMinutes) {
                            stationCount = tryStations;
                            minutesPerStation = tryMinPerStation;
                            stationBlockMinutes = tryBlockMinutes;
                            stationBreakNeeded = tryBreak;
                            break;
                        }
                    }
                }

                final int stationTotalNeeded = stationCount > 0
                        ? stationBlockMinutes + stationBreakNeeded : 0;

                // --- Grundlagen: alle zusammen ---
                if (!basics.isEmpty() && focusMinutes >= BASICS_DRILL_MINUTES) {
                    final int availableForBasics = stationCount > 0
                            ? Math.max(0, focusMinutes - stationTotalNeeded) : focusMinutes;
                    final int numBasics = Math.min(MAX_BASICS_DRILLS,
                            Math.min(basics.size(), availableForBasics / BASICS_DRILL_MINUTES));
                    if (numBasics > 0) {
                        final int basicsTime = numBasics * BASICS_DRILL_MINUTES;
                        for (int i = 0; i < numBasics; i++) {
                            sections.add(buildDrillSection(basics.get(i), "DRILL", BASICS_DRILL_MINUTES, playerCount));
                            usedDrillIds.add(basics.get(i).getId());
                        }
                        focusUsed += basicsTime;
                    }
                }

                // --- Positions-/Simulations-Drills: Stationsblock (parallel in Gruppen) ---
                int remainingFocusMinutes = focusMinutes - focusUsed;
                if (stationCount > 0 && remainingFocusMinutes >= stationBlockMinutes) {
                    final int stationDrills = Math.min(advanced.size(), stationCount);
                    final int blockMinutes = stationDrills * minutesPerStation;
                    // Aufbaupause
                    if (focusUsed > 0 && remainingFocusMinutes > blockMinutes) {
                        final int idealBreak = stationDrills >= 3 ? BREAK_MINUTES * 2 : BREAK_MINUTES;
                        final int actualBreak = Math.min(idealBreak, remainingFocusMinutes - blockMinutes);
                        sections.add(buildBreakSection("Trinken, nächste Übungen kurz erklären. Wer die Übung kennt, hilft beim Stationen aufbauen.", actualBreak));
                        focusUsed += actualBreak;
                        remainingFocusMinutes -= actualBreak;
                    }
                    final List<Drill> blockDrills = advanced.subList(0, stationDrills);
                    sections.addAll(buildStationBlock(blockDrills, playerCount, blockMinutes, parallelGroupCounter));
                    blockDrills.forEach(d -> usedDrillIds.add(d.getId()));
                    parallelGroupCounter++;
                    focusUsed += blockMinutes;
                } else if (!advanced.isEmpty() && remainingFocusMinutes >= MIN_DRILL_MINUTES) {
                    final List<TrainingPlanSection> seqDrills = buildSequentialDrills(
                            advanced, playerCount, remainingFocusMinutes);
                    sections.addAll(seqDrills);
                    advanced.forEach(d -> usedDrillIds.add(d.getId()));
                    focusUsed += remainingFocusMinutes;
                }
            }

            usedDrillMinutes += focusUsed;
        }

        // Keine Pause nach Warmup — Basics sind Partnerübungen, man geht direkt rein

        // --- SCHRITT 5: Pause + Batting ---
        final Drill hittingDrill = findById(allDrills, HITTING_DRILL_ID);
        if (hittingDrill != null && battingMinutes > 0) {
            sections.add(buildBreakSection("Trinken. Batting-Stationen aufbauen: Tees, Netz, Bälle bereitlegen. Wer die Station kennt, hilft beim Aufbau."));
            sections.add(buildDrillSection(hittingDrill, "BATTING", battingMinutes, playerCount));
        }

        // --- SCHRITT 6: Pause + Spiel ---
        if (gameMinutes > 0) {
            sections.add(buildBreakSection("Trinken. Bases aufstellen, Teams einteilen."));
            sections.add(buildGameSection(playerCount, gameMinutes));
        }

        final int groupCount = Math.min(playerCount >= 12 ? 3 : 2, Math.max(2, playerCount / IDEAL_GROUP_SIZE));
        final int minGroup = playerCount / groupCount;
        final int maxGroup = (int) Math.ceil((double) playerCount / groupCount);
        final String groupHint = minGroup == maxGroup
                ? String.format("Erfahrene Spieler gleichmäßig auf die Gruppen verteilen. Bei %d Spielern: %d Gruppen à %d.",
                        playerCount, groupCount, minGroup)
                : String.format("Erfahrene Spieler gleichmäßig auf die Gruppen verteilen. Bei %d Spielern: %d Gruppen à %d-%d.",
                        playerCount, groupCount, minGroup, maxGroup);

        return new TrainingPlanContent(sections, groupHint, null);
    }

    // ─── Stationsblock ───

    private List<TrainingPlanSection> buildStationBlock(final List<Drill> drills, final int playerCount,
                                                         final int totalMinutes, final int parallelGroup) {
        final List<TrainingPlanSection> sections = new ArrayList<>();
        final int maxStations = playerCount >= 12 ? 3 : 2;
        final int numStations = Math.min(drills.size(), Math.min(maxStations, Math.max(2, playerCount / IDEAL_GROUP_SIZE)));
        final int minPerGroup = playerCount / numStations;
        final int maxPerGroup = (int) Math.ceil((double) playerCount / numStations);
        final int minutesPerStation = totalMinutes / numStations;
        final String groupSizeText = minPerGroup == maxPerGroup
                ? String.valueOf(minPerGroup)
                : minPerGroup + "-" + maxPerGroup;

        for (int i = 0; i < numStations; i++) {
            final Drill drill = drills.get(i);
            final TrainingPlanSection section = buildDrillSection(drill, "DRILL", totalMinutes, playerCount);
            section.setParallelGroup(parallelGroup);
            section.setPlayersPerGroup(maxPerGroup);
            section.setRotationPlan(String.format(
                    "%d Gruppen à %s Spieler. %d Minuten pro Station, dann rotieren. Nach %d Minuten hat jede Gruppe jeden Drill gemacht.",
                    numStations, groupSizeText, minutesPerStation, totalMinutes));
            section.setGroupSetup(String.format("Station %s — %s", Character.toString('A' + i), drill.getName()));
            sections.add(section);
        }

        return sections;
    }

    // ─── Sequentielle Drills ───

    private List<TrainingPlanSection> buildSequentialDrills(final List<Drill> drills, final int playerCount,
                                                             final int totalMinutes) {
        final List<TrainingPlanSection> sections = new ArrayList<>();
        final int numDrills = Math.min(drills.size(), Math.max(1, totalMinutes / 15));
        final int minutesPerDrill = totalMinutes / Math.max(1, numDrills);
        int usedMinutes = 0;

        for (int i = 0; i < numDrills; i++) {
            final int minutes = (i == numDrills - 1) ? totalMinutes - usedMinutes : minutesPerDrill;
            sections.add(buildDrillSection(drills.get(i), "DRILL", minutes, playerCount));
            usedMinutes += minutes;
        }

        return sections;
    }

    // ─── Section Builder ───

    private TrainingPlanSection buildDrillSection(final Drill drill, final String type,
                                                   final int durationMinutes, final int playerCount) {
        final TrainingPlanSection section = new TrainingPlanSection();
        section.setDrillId(drill.getId());
        section.setSectionType(type);
        section.setTitle(drill.getName());
        section.setDurationMinutes(durationMinutes);
        section.setRotationPlan(drill.getRotation());
        section.setSetupNotes(drill.getEquipment() != null && !drill.getEquipment().isEmpty()
                ? "Equipment: " + String.join(", ", drill.getEquipment()) : null);
        section.setAdaptationNotes(buildAdaptationNote(drill, playerCount));
        return section;
    }

    private TrainingPlanSection buildGameSection(final int playerCount, final int durationMinutes) {
        final TrainingPlanSection section = new TrainingPlanSection();
        section.setDrillId(null);
        section.setSectionType("GAME");
        final int teamA = playerCount / 2;
        final int teamB = playerCount - teamA;
        section.setTitle(teamA == teamB
                ? String.format("Spiel (%d vs %d)", teamA, teamB)
                : String.format("Spiel (%d vs %d — ein Team hat einen Outfielder mehr)", teamA, teamB));
        section.setDurationMinutes(durationMinutes);
        section.setRotationPlan("Keine Rotation — durchspielen.");
        section.setAdaptationNotes(teamA != teamB ? "Das kleinere Team stellt einen Outfielder weniger." : null);
        return section;
    }

    // ─── Pause ───

    private TrainingPlanSection buildBreakSection(final String setupHint) {
        return buildBreakSection(setupHint, BREAK_MINUTES);
    }

    private TrainingPlanSection buildBreakSection(final String setupHint, final int minutes) {
        final TrainingPlanSection section = new TrainingPlanSection();
        section.setSectionType("BREAK");
        section.setTitle("Pause");
        section.setDurationMinutes(minutes);
        if (setupHint != null) {
            section.setSetupNotes(setupHint);
        }
        return section;
    }

    // ─── Helpers ───

    private String buildAdaptationNote(final Drill drill, final int playerCount) {
        if (playerCount < drill.getMinPlayers()) {
            return String.format("Achtung: Drill braucht mind. %d Spieler, nur %d verfügbar.",
                    drill.getMinPlayers(), playerCount);
        }
        if (playerCount > drill.getMinPlayers() * 3) {
            return String.format("Bei %d Spielern: Mehrere Gruppen bilden die parallel üben.", playerCount);
        }
        return null;
    }

    private int calculateBattingMinutes(final int totalMinutes, final int remainingAfterWarmup,
                                            final int playerCount) {
        if (totalMinutes >= 180) return 60;
        if (totalMinutes >= 120) {
            // Ab 12 Spielern: 50 min (mehr Rotationen nötig), unter 12: 40 min
            return playerCount >= 12 ? 50 : 40;
        }
        if (totalMinutes >= 90) return 40;
        // Kurze Trainings: mindestens 15 min, aber nicht mehr als die Hälfte der verbleibenden Zeit
        return Math.max(15, Math.min(40, remainingAfterWarmup / 2));
    }

    private List<String> parseFocuses(final String focus) {
        if (focus == null || focus.isBlank()) {
            return List.of("ALLROUND");
        }
        final List<String> result = new ArrayList<>();
        for (final String f : focus.split(",")) {
            final String trimmed = f.trim().toUpperCase();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result.isEmpty() ? List.of("ALLROUND") : result;
    }

    private List<Drill> filterDrillsForFocus(final List<Drill> allDrills, final String singleFocus,
                                               final int maxPlayers) {
        final List<DrillCategory> categories = FOCUS_CATEGORY_MAP.getOrDefault(
                singleFocus, List.of(DrillCategory.values()));

        return allDrills.stream()
                .filter(d -> !d.getId().equals(WARMUP_DRILL_ID))
                .filter(d -> !d.getId().equals(HITTING_DRILL_ID))
                .filter(d -> !d.getCategories().contains(DrillCategory.WARMUP))
                .filter(d -> !d.getCategories().contains(DrillCategory.HITTING))
                .filter(d -> d.getMinPlayers() <= maxPlayers)
                .filter(d -> d.getCategories().stream().anyMatch(categories::contains))
                .toList();
    }

    private Drill findById(final List<Drill> drills, final String id) {
        return drills.stream().filter(d -> d.getId().equals(id)).findFirst().orElse(null);
    }

    // ─── Progression ───

    private static final Set<DrillCategory> POSITION_CATEGORIES = Set.of(
            DrillCategory.FIRST_BASE, DrillCategory.SECOND_BASE, DrillCategory.SS,
            DrillCategory.THIRD_BASE, DrillCategory.OUTFIELD, DrillCategory.CATCHER, DrillCategory.PITCHER);

    private static final Set<DrillCategory> SIMULATION_CATEGORIES = Set.of(
            DrillCategory.SITUATIONAL, DrillCategory.DOUBLE_PLAY, DrillCategory.BUNT_DEFENSE,
            DrillCategory.COMINGS);

    /**
     * Bestimmt das Progressionslevel eines Drills:
     * 1 = Grundlagen (keine Position, nur Skills wie THROWING/FIELDING)
     * 2 = Positionsspezifisch (hat Position-Kategorie, keine Simulation)
     * 3 = Spielsituation (hat SITUATIONAL/DOUBLE_PLAY/RELAY/etc.)
     */
    private int drillLevel(final Drill drill) {
        final List<DrillCategory> cats = drill.getCategories();
        if (cats.stream().anyMatch(SIMULATION_CATEGORIES::contains)) return 3;
        if (cats.stream().anyMatch(POSITION_CATEGORIES::contains)) return 2;
        return 1;
    }

    /** Sortiert Drills nach Progression: Grundlagen → Position → Simulation. Innerhalb jedes Levels geshuffled. */
    private List<Drill> sortByProgression(final List<Drill> drills) {
        final List<Drill> level1 = new ArrayList<>();
        final List<Drill> level2 = new ArrayList<>();
        final List<Drill> level3 = new ArrayList<>();
        for (final Drill d : drills) {
            switch (drillLevel(d)) {
                case 1 -> level1.add(d);
                case 2 -> level2.add(d);
                default -> level3.add(d);
            }
        }
        Collections.shuffle(level1);
        Collections.shuffle(level2);
        Collections.shuffle(level3);
        final List<Drill> result = new ArrayList<>(drills.size());
        result.addAll(level1);
        result.addAll(level2);
        result.addAll(level3);
        return result;
    }
}
