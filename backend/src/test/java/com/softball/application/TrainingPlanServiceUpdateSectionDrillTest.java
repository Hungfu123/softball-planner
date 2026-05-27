package com.softball.application;

import com.softball.domain.model.Drill;
import com.softball.domain.model.SectionGroup;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TrainingPlanServiceUpdateSectionDrillTest {

    @Mock private TrainingPlanRepository planRepository;
    @Mock private TrainingRepository trainingRepository;
    @Mock private DrillService drillService;

    @InjectMocks
    private TrainingPlanService service;

    @Test
    void updateSectionDrill_replacesDrillMetaKeepsUserEdits() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new ArrayList<>();
        sections.add(makeSection("WARMUP", "OLD-WARMUP", SectionGroup.ALL, 30));
        final TrainingPlanSection target = makeSection("DRILL", "OLD", SectionGroup.BEGINNER, 25);
        target.setUserNotes("User-Notiz behalten");
        target.setRounds(3);
        target.setParallelGroup(2);
        target.setPlayersPerGroup(4);
        sections.add(target);
        sections.add(makeSection("BATTING", "OLD-BAT", SectionGroup.ALL, 45));

        final TrainingPlanContent content = new TrainingPlanContent(sections, null, null);
        plan.setContent(content);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(planRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        final Drill newDrill = new Drill();
        newDrill.setId("NEW");
        newDrill.setName("Neuer Drill");
        newDrill.setRotation("Neue Rotation");
        when(drillService.findById("NEW")).thenReturn(Optional.of(newDrill));

        service.updateSectionDrill(1L, 1, "NEW");

        final TrainingPlanSection updated = plan.getContent().getSections().get(1);
        assertThat(updated.getDrillId()).isEqualTo("NEW");
        assertThat(updated.getTitle()).isEqualTo("Neuer Drill");
        assertThat(updated.getRotationPlan()).isEqualTo("Neue Rotation");
        assertThat(updated.getUserNotes()).isEqualTo("User-Notiz behalten");
        assertThat(updated.getRounds()).isEqualTo(3);
        assertThat(updated.getDurationMinutes()).isEqualTo(25);
        assertThat(updated.getGroup()).isEqualTo(SectionGroup.BEGINNER);
        assertThat(updated.getSectionType()).isEqualTo("DRILL");
        assertThat(updated.getParallelGroup()).isEqualTo(2);
        assertThat(updated.getPlayersPerGroup()).isEqualTo(4);

        // Sibling sections unchanged
        assertThat(plan.getContent().getSections().get(0).getDrillId()).isEqualTo("OLD-WARMUP");
        assertThat(plan.getContent().getSections().get(2).getDrillId()).isEqualTo("OLD-BAT");
    }

    @Test
    void updateSectionDrill_planNotFound_throws404() {
        when(planRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSectionDrill(99L, 0, "NEW"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateSectionDrill_indexOutOfRange_throws400() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new ArrayList<>();
        sections.add(makeSection("WARMUP", "W", SectionGroup.ALL, 30));
        plan.setContent(new TrainingPlanContent(sections, null, null));
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.updateSectionDrill(1L, 5, "NEW"))
                .isInstanceOf(BusinessValidationException.class);

        assertThatThrownBy(() -> service.updateSectionDrill(1L, -1, "NEW"))
                .isInstanceOf(BusinessValidationException.class);
    }

    @Test
    void updateSectionDrill_drillNotFound_throws404() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "BATTING_PITCHING", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new ArrayList<>();
        sections.add(makeSection("DRILL", "OLD", SectionGroup.ALL, 30));
        plan.setContent(new TrainingPlanContent(sections, null, null));
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(drillService.findById("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSectionDrill(1L, 0, "MISSING"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private TrainingPlanSection makeSection(final String type, final String drillId, final SectionGroup group, final int duration) {
        final TrainingPlanSection s = new TrainingPlanSection();
        s.setSectionType(type);
        s.setDrillId(drillId);
        s.setTitle(drillId);
        s.setGroup(group);
        s.setDurationMinutes(duration);
        return s;
    }
}
