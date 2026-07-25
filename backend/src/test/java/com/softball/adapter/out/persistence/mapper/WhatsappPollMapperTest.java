package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WhatsappPollMapperTest {

    private final WhatsappPollMapper mapper = new WhatsappPollMapper(new ObjectMapper());

    @Test
    void roundTrip_oneOff() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("Titel");
        p.setOptions(List.of("Ja", "Nein"));
        p.setTime(LocalTime.of(18, 0));
        p.setTrainingCoupled(false);
        p.setSendDate(LocalDate.of(2026, 8, 5));

        final WhatsappPollEntity e = mapper.toEntity(p);
        assertThat(e.isTrainingCoupled()).isFalse();
        assertThat(e.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(e.getWeekday()).isNull();

        final WhatsappPoll back = mapper.toDomain(e);
        assertThat(back.isTrainingCoupled()).isFalse();
        assertThat(back.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(back.getWeekday()).isNull();
    }

    @Test
    void roundTrip_coupled() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("g@g.us");
        p.setTitle("Titel");
        p.setOptions(List.of("Ja", "Nein"));
        p.setTime(LocalTime.of(9, 0));
        p.setTrainingCoupled(true);
        p.setWeekday(DayOfWeek.MONDAY);

        final WhatsappPoll back = mapper.toDomain(mapper.toEntity(p));
        assertThat(back.isTrainingCoupled()).isTrue();
        assertThat(back.getWeekday()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(back.getSendDate()).isNull();
    }
}
