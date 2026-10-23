package com.softball.application;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringWhatsappPollRepository;
import com.softball.domain.model.PollMode;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.domain.service.CoupledPollTargetResolver;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser(roles = "SUPERADMIN")
class WhatsappPollServiceTest {

    // Feste Clock statt LocalDate.now() — Spieltag-Validierung prüft "Vergangenheit" relativ zur
    // Service-Clock; dieselbe Instanz wie in WhatsappPollServiceSendNowTest, damit beide Testklassen
    // konsistent gegen denselben Referenzzeitpunkt laufen.
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-07-20T10:00:00Z"), ZoneId.of("Europe/Berlin"));

    @Autowired WhatsappSender sender;

    @Autowired TrainingRepository trainingRepo;

    @Autowired SpringWhatsappPollRepository whatsappPollRepository;

    @Autowired WhatsappPollRepository pollRepository;

    private WhatsappPollService service;

    @BeforeEach
    void setUp() {
        service = new WhatsappPollService(pollRepository, sender, trainingRepo, new CoupledPollTargetResolver(), FIXED_CLOCK);
    }

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
        p.setMode(PollMode.TRAINING);
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
        toOneOff.setMode(PollMode.ONE_OFF);
        toOneOff.setSendDate(LocalDate.of(2026, 8, 5));
        service.update(saved.getId(), toOneOff);

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.getMode()).isEqualTo(PollMode.ONE_OFF);
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
        p.setMode(PollMode.ONE_OFF);
        p.setWeekday(null);
        p.setSendDate(LocalDate.now().plusDays(3));
        final WhatsappPoll saved = service.create(p);
        saved.setLastSentAt(LocalDateTime.now().minusDays(1));
        saved.setLastSentMessageId("sent-msg");
        pollRepository.save(saved);

        final WhatsappPoll upd = sample();
        upd.setMode(PollMode.ONE_OFF);
        upd.setWeekday(null);
        upd.setSendDate(LocalDate.now().plusDays(10));
        service.update(saved.getId(), upd);

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.getSendDate()).isEqualTo(LocalDate.now().plusDays(10));
        assertThat(after.getLastSentAt()).isNull();
        assertThat(after.getLastSentMessageId()).isNull();
    }

    @Test
    void update_oneOffToCoupled_switchesFieldsAndNullsSendDate() {
        // Rückrichtung: einmalig -> Trainingsumfrage. validate koppelt (weekday nötig) + nullt sendDate.
        final WhatsappPoll p = sample();
        p.setMode(PollMode.ONE_OFF);
        p.setWeekday(null);
        p.setSendDate(LocalDate.now().plusDays(5));
        final WhatsappPoll saved = service.create(p);
        assertThat(saved.getMode()).isEqualTo(PollMode.ONE_OFF);
        assertThat(saved.getSendDate()).isNotNull();

        final WhatsappPoll toCoupled = sample(); // sample() ist gekoppelt mit weekday TUESDAY
        service.update(saved.getId(), toCoupled);

        final WhatsappPoll after = service.findById(saved.getId());
        assertThat(after.getMode()).isEqualTo(PollMode.TRAINING);
        assertThat(after.getWeekday()).isEqualTo(DayOfWeek.TUESDAY);
        assertThat(after.getSendDate()).isNull();
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
        p.setMode(PollMode.TRAINING);
        p.setWeekday(null);
        assertThrows(BusinessValidationException.class, () -> service.create(p));
    }

    @Test
    void create_oneOffWithoutSendDate_throws() {
        final WhatsappPoll p = sample();
        p.setMode(PollMode.ONE_OFF);
        p.setSendDate(null);
        assertThrows(BusinessValidationException.class, () -> service.create(p));
    }

    @Test
    void create_oneOff_clearsWeekday() {
        final WhatsappPoll p = sample();
        p.setMode(PollMode.ONE_OFF);
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

    @Test
    void shouldRejectGameDayPollWithoutGameDay() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setGameDayId(null);

        assertThatThrownBy(() -> service.create(poll))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Spieltag");
    }

    @Test
    void shouldRejectGameDayPollWithPastSendDate() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setSendDate(LocalDate.now(FIXED_CLOCK).minusDays(1));

        assertThatThrownBy(() -> service.create(poll))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Vergangenheit");
    }

    @Test
    void shouldClearWeekdayAndForceEnabledForGameDayPoll() {
        final WhatsappPoll poll = gameDayPoll();
        poll.setWeekday(DayOfWeek.FRIDAY);
        poll.setEnabled(false);

        final WhatsappPoll saved = service.create(poll);

        assertThat(saved.getWeekday()).isNull();
        assertThat(saved.isEnabled()).isTrue();
    }

    @Test
    void shouldClearSendHistoryWhenGameDayChangesButModeStaysGameDay() {
        // Poll wurde für Spieltag A bereits (test-)versendet. Wechsel auf Spieltag B, Modus bleibt
        // GAME_DAY: die alte Sendehistorie gehört zu A, sonst würde der Stimmen-Abruf die Stimmen
        // des alten Spieltags auf den neuen ziehen.
        final WhatsappPoll saved = service.create(gameDayPoll());
        final WhatsappPoll sentState = pollRepository.findById(saved.getId()).orElseThrow();
        sentState.setLastSentMessageId("old-msg");
        sentState.setLastSentAt(LocalDateTime.of(2026, 7, 20, 18, 0));
        pollRepository.save(sentState);

        final WhatsappPoll incoming = gameDayPoll();
        incoming.setGameDayId(77L); // anderer Spieltag, Modus bleibt GAME_DAY

        final WhatsappPoll updated = service.update(saved.getId(), incoming);

        assertThat(updated.getMode()).isEqualTo(PollMode.GAME_DAY);
        assertThat(updated.getGameDayId()).isEqualTo(77L);
        assertThat(updated.getLastSentMessageId()).isNull();
        assertThat(updated.getLastSentAt()).isNull();
        assertThat(updated.getLastSentTrainingId()).isNull();
    }

    @Test
    void shouldDropGameDayLinkWhenSwitchingAwayFromGameDayMode() {
        final WhatsappPoll saved = service.create(gameDayPoll());
        final WhatsappPoll incoming = gameDayPoll();
        incoming.setMode(PollMode.ONE_OFF);
        incoming.setGameDayId(null);

        final WhatsappPoll updated = service.update(saved.getId(), incoming);

        assertThat(updated.getGameDayId()).isNull();
        assertThat(updated.getLastSentMessageId()).isNull();
    }

    @Test
    void shouldRejectSecondPollForSameGameDay() {
        // uq_poll_game_day greift erst beim Speichern (DataIntegrityViolationException -> 500) —
        // die fachliche Prüfung muss vorher greifen und eine verständliche Meldung liefern.
        service.create(gameDayPoll());
        final WhatsappPoll second = gameDayPoll();

        assertThatThrownBy(() -> service.create(second))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("schon eine Umfrage");
    }

    @Test
    void shouldAllowUpdatingOwnPollOnSameGameDay() {
        // Der eigene Poll darf beim Update nicht als Kollision mit sich selbst gelten.
        final WhatsappPoll saved = service.create(gameDayPoll());
        final WhatsappPoll incoming = gameDayPoll();
        incoming.setTitle("Geänderte Frage");

        final WhatsappPoll updated = service.update(saved.getId(), incoming);

        assertThat(updated.getTitle()).isEqualTo("Geänderte Frage");
        assertThat(updated.getGameDayId()).isEqualTo(saved.getGameDayId());
    }

    @Test
    void shouldRejectUpdatingSecondPollOntoOccupiedGameDay() {
        final WhatsappPoll first = service.create(gameDayPoll()); // belegt gameDayId 42
        final WhatsappPoll otherGameDay = gameDayPoll();
        otherGameDay.setGameDayId(99L);
        final WhatsappPoll second = service.create(otherGameDay);

        final WhatsappPoll incoming = gameDayPoll();
        incoming.setGameDayId(first.getGameDayId()); // versucht auf den belegten Spieltag zu wechseln

        assertThatThrownBy(() -> service.update(second.getId(), incoming))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("schon eine Umfrage");
    }

    // Helper: gueltiger Spieltag-Poll (Ja-Option zuerst, wie in beiden Vorlagen)
    private WhatsappPoll gameDayPoll() {
        final WhatsappPoll poll = new WhatsappPoll();
        poll.setGroupId("g1");
        poll.setTitle("CoSe Spieltag in Aachen dabei?");
        poll.setOptions(List.of("Ja ich will spielen", "Ich habe ein Auto und würde fahren", "Nein"));
        poll.setAllowMultipleAnswers(true);
        poll.setTime(LocalTime.of(18, 0));
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(42L);
        poll.setSendDate(LocalDate.now(FIXED_CLOCK).plusDays(7));
        return poll;
    }
}
