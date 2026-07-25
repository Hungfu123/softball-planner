package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.adapter.out.persistence.repository.SpringTrainingPeriodRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.Training;
import com.softball.domain.port.out.TrainingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression: Der WhatsApp-Poll-Scheduler läuft auf einem Scheduling-Thread OHNE offene
 * Hibernate-Session (kein Open-Session-in-View). Das entity→domain-Mapping in
 * {@code TrainingMapper.toDomain} dereferenziert IMMER die {@code period}-Assoziation — bei
 * LAZY-Fetch warf das eine {@code LazyInitializationException} und riss den Scheduler jede Minute ab.
 *
 * <p>Dieser Test ruft den Port {@link TrainingRepository} bewusst OHNE {@code @Transactional} auf
 * (Session je Repo-Call sofort wieder zu) und stellt sicher, dass das Period-Mapping trotzdem
 * durchläuft.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class TrainingRepositoryAdapterLazyIT {

    @Autowired
    private SpringTrainingRepository trainingRepo;

    @Autowired
    private SpringTrainingPeriodRepository periodRepo;

    @Autowired
    private TrainingRepository adapter;

    @Test
    void findAll_mapsPeriod_withoutOpenSession() {
        TrainingPeriodEntity period =
                new TrainingPeriodEntity("Sommersaison", LocalDate.of(2026, 4, 1), LocalDate.of(2026, 10, 31));
        period.setWeekdays("1,4,6");
        period = periodRepo.save(period);

        final TrainingEntity training = new TrainingEntity(LocalDate.of(2026, 7, 25), "13:00", "Park");
        training.setPeriod(period);
        trainingRepo.save(training);

        // KEIN @Transactional hier: Session schließt nach jedem Repo-Call — wie im Scheduler-Thread.
        final List<Training> all = adapter.findAllByOrderByDateDesc();

        assertThat(all).isNotEmpty();
        final Training mapped = all.stream()
                .filter(t -> "Park".equals(t.getLocation()))
                .findFirst().orElseThrow();
        assertThat(mapped.getPeriod()).isNotNull();
        assertThat(mapped.getPeriod().getWeekdays()).containsExactly(1, 4, 6);
    }
}
