package com.softball.application;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringWhatsappPollRepository;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.shared.exception.BusinessValidationException;
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
import static org.junit.jupiter.api.Assertions.assertThrows;

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
        p.setTrainingCoupled(true);
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
    void update_coupledToOneOff_clearsSendHistory() {
        // C1: ein bereits gesendeter, gekoppelter Poll wird auf einmalig umgestellt.
        // Alte lastSent*-Werte müssen weg, sonst bucht der Vote-Sync aufs alte Training weiter.
        final WhatsappPoll saved = service.create(sample());
        saved.setLastSentTrainingId(99L);
        saved.setLastSentMessageId("old-msg");
        saved.setLastSentAt(LocalDateTime.of(2026, 4, 13, 20, 0));
        pollRepository.save(saved);

        final WhatsappPoll toOneOff = sample();
        toOneOff.setTrainingCoupled(false);
        toOneOff.setSendDate(LocalDate.of(2026, 8, 5));
        service.update(saved.getId(), toOneOff);

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.isTrainingCoupled()).isFalse();
        assertThat(after.getWeekday()).isNull();
        assertThat(after.getLastSentTrainingId()).isNull();
        assertThat(after.getLastSentMessageId()).isNull();
        assertThat(after.getLastSentAt()).isNull();
    }

    @Test
    void update_oneOffRescheduledToFuture_reArms() {
        // C2: ein bereits gesendeter einmaliger Poll wird auf ein neues Zukunftsdatum umgeplant
        // → lastSentAt muss weg, sonst feuert isDueOneOff nie wieder.
        final WhatsappPoll p = sample();
        p.setTrainingCoupled(false);
        p.setWeekday(null);
        p.setSendDate(LocalDate.now().plusDays(3));
        final WhatsappPoll saved = service.create(p);
        saved.setLastSentAt(LocalDateTime.now().minusDays(1));
        saved.setLastSentMessageId("sent-msg");
        pollRepository.save(saved);

        final WhatsappPoll upd = sample();
        upd.setTrainingCoupled(false);
        upd.setWeekday(null);
        upd.setSendDate(LocalDate.now().plusDays(10));
        service.update(saved.getId(), upd);

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.getSendDate()).isEqualTo(LocalDate.now().plusDays(10));
        assertThat(after.getLastSentAt()).isNull();
        assertThat(after.getLastSentMessageId()).isNull();
    }

    @Test
    void resetLastSent_clearsTrainingId() {
        // I3: reset muss auch die Trainings-Kopplung lösen, sonst blockt isDue weiter.
        final WhatsappPoll saved = service.create(sample());
        saved.setLastSentAt(LocalDateTime.now());
        saved.setLastSentTrainingId(55L);
        pollRepository.save(saved);

        service.resetLastSent(saved.getId());

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.getLastSentAt()).isNull();
        assertThat(after.getLastSentTrainingId()).isNull();
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
    void create_coupledWithoutWeekday_throws() {
        final WhatsappPoll p = sample();
        p.setTrainingCoupled(true);
        p.setWeekday(null);
        assertThrows(BusinessValidationException.class, () -> service.create(p));
    }

    @Test
    void create_oneOffWithoutSendDate_throws() {
        final WhatsappPoll p = sample();
        p.setTrainingCoupled(false);
        p.setSendDate(null);
        assertThrows(BusinessValidationException.class, () -> service.create(p));
    }

    @Test
    void create_oneOff_clearsWeekday() {
        final WhatsappPoll p = sample();
        p.setTrainingCoupled(false);
        p.setSendDate(LocalDate.of(2026, 8, 5));
        p.setWeekday(DayOfWeek.MONDAY);
        final WhatsappPoll saved = service.create(p);
        assertThat(saved.getWeekday()).isNull();
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
