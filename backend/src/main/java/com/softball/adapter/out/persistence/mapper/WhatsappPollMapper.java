package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.domain.model.WhatsappPoll;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Component
public class WhatsappPollMapper {

    private final ObjectMapper objectMapper;

    public WhatsappPollMapper(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WhatsappPoll toDomain(final WhatsappPollEntity e) {
        if (e == null) return null;
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(e.getId());
        p.setGroupId(e.getGroupId());
        p.setGroupName(e.getGroupName());
        p.setTitle(e.getTitle());
        p.setOptions(readStrings(e.getOptions()));
        p.setWeekday(e.getWeekday() != null ? DayOfWeek.valueOf(e.getWeekday()) : null);
        p.setTime(e.getSendTime());
        p.setEnabled(e.isEnabled());
        p.setAllowMultipleAnswers(e.isAllowMultipleAnswers());
        p.setMessage(e.getMessage());
        p.setSkipDates(readDates(e.getSkipDates()));
        p.setLastSentAt(e.getLastSentAt());
        p.setLastSentMessageId(e.getLastSentMessageId());
        p.setLastSentTrainingId(e.getLastSentTrainingId());
        p.setTrainingCoupled(e.isTrainingCoupled());
        p.setSendDate(e.getSendDate());
        return p;
    }

    public WhatsappPollEntity toEntity(final WhatsappPoll p) {
        final WhatsappPollEntity e = new WhatsappPollEntity();
        e.setId(p.getId());
        applyScalars(e, p);
        return e;
    }

    public void updateEntity(final WhatsappPollEntity e, final WhatsappPoll p) {
        applyScalars(e, p);
    }

    private void applyScalars(final WhatsappPollEntity e, final WhatsappPoll p) {
        e.setGroupId(p.getGroupId());
        e.setGroupName(p.getGroupName());
        e.setTitle(p.getTitle());
        e.setOptions(write(p.getOptions()));
        e.setWeekday(p.getWeekday() != null ? p.getWeekday().name() : null);
        e.setSendTime(p.getTime());
        e.setEnabled(p.isEnabled());
        e.setAllowMultipleAnswers(p.isAllowMultipleAnswers());
        e.setMessage(p.getMessage());
        e.setSkipDates(write(p.getSkipDates()));
        e.setLastSentAt(p.getLastSentAt());
        e.setLastSentMessageId(p.getLastSentMessageId());
        e.setLastSentTrainingId(p.getLastSentTrainingId());
        e.setTrainingCoupled(p.isTrainingCoupled());
        e.setSendDate(p.getSendDate());
    }

    private List<String> readStrings(final String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<List<String>>() {}); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("options json", ex); }
    }

    private List<LocalDate> readDates(final String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<List<LocalDate>>() {}); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("skipDates json", ex); }
    }

    private String write(final Object value) {
        try { return objectMapper.writeValueAsString(value != null ? value : List.of()); }
        catch (final JsonProcessingException ex) { throw new RuntimeException("write json", ex); }
    }
}
