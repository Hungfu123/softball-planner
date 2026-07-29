package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.domain.model.PollMode;
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
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(LocalDate.of(2026, 8, 5));

        final WhatsappPollEntity e = mapper.toEntity(p);
        assertThat(e.getMode()).isEqualTo("ONE_OFF");
        assertThat(e.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(e.getWeekday()).isNull();

        final WhatsappPoll back = mapper.toDomain(e);
        assertThat(back.getMode()).isEqualTo(PollMode.ONE_OFF);
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
        p.setMode(PollMode.TRAINING);
        p.setWeekday(DayOfWeek.MONDAY);

        final WhatsappPoll back = mapper.toDomain(mapper.toEntity(p));
        assertThat(back.getMode()).isEqualTo(PollMode.TRAINING);
        assertThat(back.getWeekday()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(back.getSendDate()).isNull();
    }

    @Test
    void shouldMapGameDayModeAndGameDayId() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setGroupId("g1");
        poll.setTitle("Heimspieltag");
        poll.setOptions(List.of("Ja, ich spiele", "Ich helfe", "Ich kann nicht"));
        poll.setTime(LocalTime.of(18, 0));
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setSendDate(LocalDate.of(2026, 8, 2));

        final WhatsappPollEntity entity = mapper.toEntity(poll);
        assertThat(entity.getMode()).isEqualTo("GAME_DAY");
        assertThat(entity.getGameDayId()).isEqualTo(42L);

        final WhatsappPoll back = mapper.toDomain(entity);
        assertThat(back.getMode()).isEqualTo(PollMode.GAME_DAY);
        assertThat(back.getGameDayId()).isEqualTo(42L);
    }
}
