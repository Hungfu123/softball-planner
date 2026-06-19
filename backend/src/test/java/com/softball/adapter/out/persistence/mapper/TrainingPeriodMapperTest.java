package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.TrainingPeriod;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingPeriodMapperTest {

    private final TrainingPeriodMapper mapper = new TrainingPeriodMapper();

    @Test
    void roundTrip_preservesWeekdaysTimeLocation() {
        final TrainingPeriod domain = new TrainingPeriod("Sommer", LocalDate.of(2026, 4, 1), LocalDate.of(2026, 9, 30));
        domain.setWeekdays(List.of(2, 4));
        domain.setTime("18:00");
        domain.setLocation("Park");

        final TrainingPeriodEntity entity = mapper.toEntity(domain);
        assertThat(entity.getWeekdays()).isEqualTo("2,4");

        final TrainingPeriod back = mapper.toDomain(entity);
        assertThat(back.getWeekdays()).containsExactly(2, 4);
        assertThat(back.getTime()).isEqualTo("18:00");
        assertThat(back.getLocation()).isEqualTo("Park");
    }

    @Test
    void toDomain_nullWeekdays_yieldsEmptyList() {
        final TrainingPeriodEntity entity = new TrainingPeriodEntity("X", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));
        final TrainingPeriod back = mapper.toDomain(entity);
        assertThat(back.getWeekdays()).isEmpty();
    }
}
