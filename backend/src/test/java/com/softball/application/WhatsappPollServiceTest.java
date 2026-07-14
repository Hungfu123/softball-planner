package com.softball.application;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringWhatsappPollRepository;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class WhatsappPollServiceTest {

    @Autowired WhatsappPollService service;

    @Autowired SpringWhatsappPollRepository whatsappPollRepository;

    @Autowired WhatsappPollRepository pollRepository;

    @AfterEach
    void tearDown() {
        whatsappPollRepository.deleteAll();
    }

    private WhatsappPoll sample() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setGroupId("123@g.us");
        p.setGroupName("Dead Sox Team");
        p.setTitle("Wer kommt zum Training morgen?");
        p.setOptions(List.of("Ja", "Nein", "Vielleicht"));
        p.setWeekday(DayOfWeek.TUESDAY);
        p.setTime(LocalTime.of(18, 0));
        p.setEnabled(true);
        return p;
    }

    @Test
    void create_persistsAndAssignsId() {
        final WhatsappPoll saved = service.create(sample());
        assertThat(saved.getId()).isNotNull();
        assertThat(service.findById(saved.getId()).getOptions()).containsExactly("Ja", "Nein", "Vielleicht");
    }

    @Test
    void addAndRemoveSkipDate() {
        final Long id = service.create(sample()).getId();
        service.addSkipDate(id, LocalDate.of(2026, 7, 14));
        assertThat(service.findById(id).getSkipDates()).containsExactly(LocalDate.of(2026, 7, 14));
        service.removeSkipDate(id, LocalDate.of(2026, 7, 14));
        assertThat(service.findById(id).getSkipDates()).isEmpty();
    }

    @Test
    void update_changesFields() {
        final Long id = service.create(sample()).getId();
        final WhatsappPoll upd = sample();
        upd.setTitle("Wer kommt zum P/C oder Basic Training morgen?");
        upd.setWeekday(DayOfWeek.SATURDAY);
        service.update(id, upd);
        assertThat(service.findById(id).getWeekday()).isEqualTo(DayOfWeek.SATURDAY);
        assertThat(service.findById(id).getTitle()).contains("P/C");
    }

    @Test
    void update_persistsAllowMultipleAndMessage() {
        final Long id = service.create(sample()).getId();
        final WhatsappPoll upd = sample();
        upd.setAllowMultipleAnswers(true);
        upd.setMessage("Event am Samstag, Treffen 14 Uhr");
        service.update(id, upd);
        final WhatsappPoll saved = service.findById(id);
        assertThat(saved.isAllowMultipleAnswers()).isTrue();
        assertThat(saved.getMessage()).isEqualTo("Event am Samstag, Treffen 14 Uhr");
    }

    @Test
    void delete_removes() {
        final Long id = service.create(sample()).getId();
        service.delete(id);
        assertThat(service.findAll()).noneMatch(p -> p.getId().equals(id));
    }

    @Test
    void resetLastSent_clearsTimestamp() {
        final Long id = service.create(sample()).getId();
        final WhatsappPoll p = pollRepository.findById(id).orElseThrow();
        p.setLastSentAt(LocalDateTime.of(2026, 7, 14, 14, 16));
        pollRepository.save(p);
        assertThat(service.findById(id).getLastSentAt()).isNotNull();

        service.resetLastSent(id);

        assertThat(service.findById(id).getLastSentAt()).isNull();
    }
}
