package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.adapter.out.persistence.entity.TrainingPeriodEntity;
import com.softball.domain.model.TrainingPeriod;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class TrainingPeriodMapper {

    private static final ObjectMapper JSON = new ObjectMapper();

    public TrainingPeriod toDomain(final TrainingPeriodEntity entity) {
        if (entity == null) return null;
        final TrainingPeriod domain = new TrainingPeriod(entity.getId(), entity.getName(), entity.getStartDate(), entity.getEndDate());
        domain.setWeekdays(fromCsv(entity.getWeekdays()));
        domain.setTime(entity.getTime());
        domain.setLocation(entity.getLocation());
        domain.setWeekdayTimes(timesFromCsv(entity.getWeekdayTimes()));
        domain.setWeekdayLocations(orteAusJson(entity.getWeekdayLocations()));
        domain.setPcOnlyWeekdays(fromCsv(entity.getPcOnlyWeekdays()));
        domain.setCycleWeeks(entity.getCycleWeeks());
        domain.setActiveWeeksInCycle(fromCsv(entity.getActiveWeeksInCycle()));
        return domain;
    }

    public TrainingPeriodEntity toEntity(final TrainingPeriod domain) {
        final TrainingPeriodEntity entity = new TrainingPeriodEntity(domain.getName(), domain.getStartDate(), domain.getEndDate());
        entity.setId(domain.getId());
        entity.setWeekdays(toCsv(domain.getWeekdays()));
        entity.setTime(domain.getTime());
        entity.setLocation(domain.getLocation());
        entity.setWeekdayTimes(timesToCsv(domain.getWeekdayTimes()));
        entity.setWeekdayLocations(orteAlsJson(domain.getWeekdayLocations()));
        entity.setPcOnlyWeekdays(toCsv(domain.getPcOnlyWeekdays()));
        entity.setCycleWeeks(domain.getCycleWeeks());
        entity.setActiveWeeksInCycle(toCsv(domain.getActiveWeeksInCycle()));
        return entity;
    }

    public void updateEntity(final TrainingPeriodEntity entity, final TrainingPeriod domain) {
        entity.setName(domain.getName());
        entity.setStartDate(domain.getStartDate());
        entity.setEndDate(domain.getEndDate());
        entity.setWeekdays(toCsv(domain.getWeekdays()));
        entity.setTime(domain.getTime());
        entity.setLocation(domain.getLocation());
        entity.setWeekdayTimes(timesToCsv(domain.getWeekdayTimes()));
        entity.setWeekdayLocations(orteAlsJson(domain.getWeekdayLocations()));
        entity.setPcOnlyWeekdays(toCsv(domain.getPcOnlyWeekdays()));
        entity.setCycleWeeks(domain.getCycleWeeks());
        entity.setActiveWeeksInCycle(toCsv(domain.getActiveWeeksInCycle()));
    }

    private String toCsv(final List<Integer> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) return null;
        return weekdays.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private List<Integer> fromCsv(final String csv) {
        if (csv == null || csv.isBlank()) return new ArrayList<>();
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Integer::valueOf)
            .collect(Collectors.toCollection(ArrayList::new));
    }

    /**
     * Orte als JSON, nicht als CSV: ein Ortsname ist freier Text und darf Komma und
     * Gleichheitszeichen enthalten — beides wuerde die CSV-Schreibweise der Uhrzeiten zerreissen.
     *
     * Faellt der Text ungueltig aus (von Hand in der Datenbank geaendert), ist die Karte leer
     * und jeder Wochentag faellt auf den Ort der Periode zurueck. Eine kaputte Zeile soll die
     * Periode nicht unlesbar machen.
     */
    private String orteAlsJson(final Map<Integer, String> orte) {
        if (orte == null || orte.isEmpty()) return "{}";
        try {
            return JSON.writeValueAsString(orte);
        } catch (final Exception e) {
            return "{}";
        }
    }

    private Map<Integer, String> orteAusJson(final String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            return JSON.readValue(json, new TypeReference<LinkedHashMap<Integer, String>>() {});
        } catch (final Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private String timesToCsv(final Map<Integer, String> weekdayTimes) {
        if (weekdayTimes == null || weekdayTimes.isEmpty()) return null;
        return weekdayTimes.entrySet().stream().sorted(Map.Entry.comparingByKey())
            .map(e -> e.getKey() + "=" + e.getValue())
            .collect(Collectors.joining(","));
    }

    private Map<Integer, String> timesFromCsv(final String csv) {
        final Map<Integer, String> out = new LinkedHashMap<>();
        if (csv == null || csv.isBlank()) return out;
        for (final String part : csv.split(",")) {
            final String[] kv = part.split("=", 2);
            if (kv.length == 2 && !kv[0].isBlank()) out.put(Integer.valueOf(kv[0].trim()), kv[1].trim());
        }
        return out;
    }
}
