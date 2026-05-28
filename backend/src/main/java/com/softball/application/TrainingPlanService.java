package com.softball.application;

import com.softball.adapter.dto.TrainingPlanContentResponse;
import com.softball.adapter.dto.TrainingPlanResponse;
import com.softball.domain.model.Drill;
import com.softball.domain.model.InfieldPosition;
import com.softball.domain.model.PlanKind;
import com.softball.domain.model.SectionGroup;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.service.TrainingPlanGenerator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TrainingPlanService {

    private static final Logger log = LoggerFactory.getLogger(TrainingPlanService.class);

    private final TrainingPlanRepository trainingPlanRepository;
    private final TrainingRepository trainingRepository;
    private final DrillService drillService;
    private final TrainingPlanGenerator generator = new TrainingPlanGenerator();

    public TrainingPlanService(final TrainingPlanRepository trainingPlanRepository,
                               final TrainingRepository trainingRepository,
                               final DrillService drillService) {
        this.trainingPlanRepository = trainingPlanRepository;
        this.trainingRepository = trainingRepository;
        this.drillService = drillService;
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes) {
        return generate(trainingId, PlanKind.MAIN, playerCount, focus, durationMinutes, List.of(), false, 0, null);
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions) {
        return generate(trainingId, PlanKind.MAIN, playerCount, focus, durationMinutes, infieldPositions, false, 0, null);
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions,
                                         final boolean withBeginnerGroup,
                                         final int beginnerCount) {
        return generate(trainingId, PlanKind.MAIN, playerCount, focus, durationMinutes, infieldPositions,
                withBeginnerGroup, beginnerCount, null);
    }

    public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions,
                                         final boolean withBeginnerGroup,
                                         final int beginnerCount,
                                         final String beginnerFocus) {
        return generate(trainingId, PlanKind.MAIN, playerCount, focus, durationMinutes, infieldPositions,
                withBeginnerGroup, beginnerCount, beginnerFocus);
    }

    public TrainingPlanResponse generate(final Long trainingId, final PlanKind kind,
                                         final int playerCount,
                                         final String focus, final int durationMinutes,
                                         final List<InfieldPosition> infieldPositions,
                                         final boolean withBeginnerGroup,
                                         final int beginnerCount,
                                         final String beginnerFocus) {
        if (!trainingRepository.existsById(trainingId)) {
            throw new ResourceNotFoundException("Training", trainingId);
        }

        final PlanKind effectiveKind = kind != null ? kind : PlanKind.MAIN;

        if (trainingPlanRepository.findByTrainingIdAndKind(trainingId, effectiveKind).isPresent()) {
            throw new BusinessValidationException(
                    "Plan dieses Typs existiert bereits (kind=" + effectiveKind + ")");
        }

        final List<InfieldPosition> safePositions = infieldPositions != null ? infieldPositions : List.of();

        // Deterministischer Generator — kein KI-Call nötig.
        // Bei separatem beginnerFocus: Drill-Pool muss BEIDE Focus-Bereiche abdecken,
        // damit der Generator für Anfänger-Block aus dem zweiten Pool filtern kann.
        final boolean hasSeparateBeginnerFocus = beginnerFocus != null && !beginnerFocus.isBlank()
                && !beginnerFocus.trim().equalsIgnoreCase(focus == null ? "" : focus.trim());
        final List<Drill> drills = hasSeparateBeginnerFocus
                ? drillService.filterByFocus(focus + "," + beginnerFocus, playerCount)
                : drillService.filterByFocus(focus, playerCount);
        final TrainingPlanContent content = generator.generate(drills, playerCount, focus, durationMinutes,
                safePositions, withBeginnerGroup, beginnerCount, beginnerFocus);

        final TrainingPlan plan = new TrainingPlan(trainingId, playerCount, focus, durationMinutes);
        plan.setKind(effectiveKind);
        plan.setContent(content);
        plan.setInfieldPositions(safePositions);
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public Map<Long, List<TrainingPlanResponse>> getByTrainingIds(final List<Long> trainingIds) {
        if (trainingIds == null || trainingIds.isEmpty()) return Map.of();
        return trainingPlanRepository.findByTrainingIdIn(trainingIds).stream()
                .collect(Collectors.groupingBy(
                        TrainingPlan::getTrainingId,
                        Collectors.mapping(TrainingPlanResponse::from, Collectors.toList())
                ));
    }

    /**
     * Liefert alle Pläne (MAIN + optional BEGINNER) für ein Training.
     * Liste ist 0-2 Einträge gross.
     */
    @Transactional(readOnly = true)
    public List<TrainingPlanResponse> getByTrainingId(final Long trainingId) {
        return trainingPlanRepository.findAllByTrainingId(trainingId).stream()
                .map(TrainingPlanResponse::from)
                .toList();
    }

    @Transactional
    public TrainingPlanResponse update(final Long planId, final TrainingPlanContentResponse contentDto) {
        final TrainingPlan plan = trainingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));
        plan.setContent(contentDto.toDomain());
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }

    @Transactional
    public void delete(final Long planId) {
        if (trainingPlanRepository.findById(planId).isEmpty()) {
            throw new ResourceNotFoundException("TrainingPlan", planId);
        }
        trainingPlanRepository.deleteById(planId);
    }

    /**
     * Fügt einen Anfänger-Block zu einem bereits existierenden Plan hinzu.
     *
     * Workflow:
     *  1. Plan laden (404 wenn nicht vorhanden)
     *  2. 400 wenn beginnerCount < 2
     *  3. 400 wenn Plan bereits BEGINNER-Sections enthält (Idempotency)
     *  4. Skill-Station-Sections finden (sectionType=DRILL mit parallelGroup gesetzt, group=ALL)
     *  5. Pro identifizierter Station-Gruppe: MAIN-Tag setzen + BEGINNER-Block parallel anfügen
     *  6. groupDistributionHint mit Info anreichern
     *  7. Plan speichern
     */
    @Transactional
    public TrainingPlanResponse addBeginnerGroup(final Long planId, final int beginnerCount,
                                                  final String beginnerFocus) {
        if (beginnerCount < 2) {
            throw new BusinessValidationException("Anfänger-Anzahl muss mindestens 2 sein");
        }

        final TrainingPlan plan = trainingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));

        final TrainingPlanContent content = plan.getContent();
        if (content == null || content.getSections() == null || content.getSections().isEmpty()) {
            throw new BusinessValidationException("Plan hat keinen Inhalt — Anfänger-Gruppe kann nicht angehängt werden");
        }

        final List<TrainingPlanSection> sections = content.getSections();
        final boolean alreadyHasBeginner = sections.stream()
                .anyMatch(s -> s.getGroup() == SectionGroup.BEGINNER);
        if (alreadyHasBeginner) {
            throw new BusinessValidationException("Plan hat bereits eine Anfänger-Gruppe");
        }

        // Skill-Station-Sections identifizieren: Stations-Blöcke (parallelGroup gesetzt)
        // die NICHT WARMUP/BATTING/GAME/BREAK/PAUSE sind.
        // Reihenfolge der parallelGroups bewahren (LinkedHashMap), damit Insert-Order stabil ist.
        final Map<Integer, List<Integer>> stationBlocksByGroup = new LinkedHashMap<>();
        for (int i = 0; i < sections.size(); i++) {
            final TrainingPlanSection s = sections.get(i);
            if (s.getParallelGroup() == null) continue;
            final String type = s.getSectionType() == null ? "" : s.getSectionType().toUpperCase();
            // Nur skill-Stations re-taggen, nicht Batting/Game/Warmup/Break
            if (!"DRILL".equals(type) && !"STATION".equals(type)) continue;
            stationBlocksByGroup.computeIfAbsent(s.getParallelGroup(), k -> new ArrayList<>()).add(i);
        }

        if (stationBlocksByGroup.isEmpty()) {
            throw new BusinessValidationException(
                    "Plan hat keine Skill-Stations — Anfänger-Gruppe braucht parallelen Block zum Anhängen");
        }

        // Drill-IDs die bereits im Plan stecken — nicht erneut für Beginner wählen
        final Set<String> usedDrillIds = sections.stream()
                .map(TrainingPlanSection::getDrillId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toCollection(HashSet::new));

        // Beginner-Pool zusammenstellen: focus-gefiltert (separater beginnerFocus oder Main-Focus)
        final String mainFocus = plan.getFocus();
        final String effectiveFocus = (beginnerFocus != null && !beginnerFocus.isBlank())
                ? beginnerFocus : mainFocus;
        final List<Drill> beginnerPool = effectiveFocus != null && !effectiveFocus.isBlank()
                ? drillService.filterByFocus(effectiveFocus, beginnerCount)
                : drillService.findAll();

        // Pro existierendem Station-Block: MAIN-Tag + Beginner-Block dahinter einfügen
        // Reverse-Iteration über Indizes damit Inserts vorherige Indizes nicht verschieben.
        final List<Map.Entry<Integer, List<Integer>>> blockEntries = new ArrayList<>(
                stationBlocksByGroup.entrySet());
        // Sortiere nach max(index) absteigend damit spätere Inserts frühere Indizes nicht kaputtmachen
        blockEntries.sort((a, b) -> {
            final int maxA = a.getValue().stream().mapToInt(Integer::intValue).max().orElse(-1);
            final int maxB = b.getValue().stream().mapToInt(Integer::intValue).max().orElse(-1);
            return Integer.compare(maxB, maxA);
        });

        final List<String> warnings = new ArrayList<>();
        int addedBlocks = 0;
        for (final Map.Entry<Integer, List<Integer>> entry : blockEntries) {
            final int mainParallelGroup = entry.getKey();
            final List<Integer> indices = entry.getValue();

            // Re-Tag MAIN auf alle Sections dieses Blocks
            for (final int idx : indices) {
                sections.get(idx).setGroup(SectionGroup.MAIN);
            }

            // Beginner-Block bauen
            final int insertAfter = indices.stream().mapToInt(Integer::intValue).max().orElse(-1);
            final Integer mainDuration = sections.get(indices.get(0)).getDurationMinutes();
            final int mainMinutes = mainDuration != null ? mainDuration : 20;
            final int beginnerParallelGroup = mainParallelGroup + 1;

            final TrainingPlanGenerator.BeginnerBlockResult result =
                    generator.buildBeginnerBlockForExistingMain(
                            beginnerPool, beginnerCount, mainMinutes,
                            beginnerParallelGroup, usedDrillIds);

            if (!result.sections().isEmpty()) {
                // Drill-IDs registrieren, damit der nächste Block nicht denselben Drill nimmt
                for (final TrainingPlanSection s : result.sections()) {
                    if (s.getDrillId() != null) usedDrillIds.add(s.getDrillId());
                }
                sections.addAll(insertAfter + 1, result.sections());
                addedBlocks++;
            }
            if (result.warning() != null && !warnings.contains(result.warning())) {
                warnings.add(result.warning());
            }
        }

        if (addedBlocks == 0) {
            throw new BusinessValidationException(
                    "Konnte keinen Anfänger-Block bauen — keine geeigneten Drills im Pool");
        }

        // Hint aktualisieren
        final String beginnerNote = String.format(
                "Anfänger-Gruppe (%d Spieler) nachträglich hinzugefügt — Hauptgruppe und Anfänger trainieren parallel.",
                beginnerCount);
        final String existingHint = content.getGroupDistributionHint();
        final String warningsJoined = warnings.isEmpty() ? "" : " · " + String.join(" · ", warnings);
        final String newHint = (existingHint != null && !existingHint.isBlank())
                ? existingHint + " · " + beginnerNote + warningsJoined
                : beginnerNote + warningsJoined;
        content.setGroupDistributionHint(newHint);

        log.info("Anfänger-Gruppe zu Plan {} hinzugefügt: {} Spieler, {} Blocks erweitert, focus={}",
                planId, beginnerCount, addedBlocks, effectiveFocus);

        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }

    @Transactional
    public TrainingPlanResponse updateSectionDrill(final Long planId, final int sectionIndex, final String drillId) {
        final TrainingPlan plan = trainingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingPlan", planId));

        final List<TrainingPlanSection> sections = plan.getContent().getSections();
        if (sectionIndex < 0 || sectionIndex >= sections.size()) {
            throw new BusinessValidationException("Section-Index " + sectionIndex
                    + " außerhalb des Range (0.." + (sections.size() - 1) + ")");
        }

        final Drill newDrill = drillService.findById(drillId)
                .orElseThrow(() -> new ResourceNotFoundException("Drill not found: " + drillId));

        final TrainingPlanSection target = sections.get(sectionIndex);
        target.setDrillId(newDrill.getId());
        target.setTitle(newDrill.getName());
        target.setRotationPlan(newDrill.getRotation());
        target.setSetupNotes(null);
        target.setTips(null);

        log.info("Section {} in Plan {} drillId getauscht: → {}", sectionIndex, planId, drillId);
        return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
    }
}
