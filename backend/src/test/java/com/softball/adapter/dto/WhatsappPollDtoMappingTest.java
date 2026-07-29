package com.softball.adapter.dto;

import com.softball.domain.model.PollMode;
import com.softball.domain.model.WhatsappPoll;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WhatsappPollDtoMappingTest {

    @Test
    void request_toDomain_mapsOneOffFields() {
        final WhatsappPollRequest req = new WhatsappPollRequest(
                "g@g.us", "Gruppe", "Titel", List.of("Ja", "Nein"),
                null, LocalTime.of(18, 0), true, false, null,
                PollMode.ONE_OFF, null, LocalDate.of(2026, 8, 5));
        final WhatsappPoll p = req.toDomain();
        assertThat(p.getMode()).isEqualTo(PollMode.ONE_OFF);
        assertThat(p.getSendDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(p.getWeekday()).isNull();
    }

    @Test
    void response_from_exposesCoupledFields() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setMode(PollMode.TRAINING);
        p.setWeekday(DayOfWeek.MONDAY);
        p.setTime(LocalTime.of(9, 0));
        final WhatsappPollResponse r = WhatsappPollResponse.from(p);
        assertThat(r.mode()).isEqualTo(PollMode.TRAINING);
        assertThat(r.sendDate()).isNull();
        assertThat(r.weekday()).isEqualTo(DayOfWeek.MONDAY);
    }
}
