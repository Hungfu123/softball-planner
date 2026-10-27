package com.softball.domain.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class TrainingPeriod {
    private Long id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> weekdays = new ArrayList<>();
    private String time;
    private String location;
    private Map<Integer, String> weekdayTimes = new LinkedHashMap<>();
    private Map<Integer, String> weekdayLocations = new LinkedHashMap<>();
    /**
     * ISO-Wochentage dieser Periode, an denen nur Pitcher und Catcher eingeladen sind.
     *
     * <p>Leer heisst: alle Termine stehen dem ganzen Kader offen. Damit ist der
     * Strukturwechsel eine Einstellung statt Code — ab November traegt der Donnerstag
     * das Nur-P/C-Training, ab April wandert es zurueck oder faellt weg.
     */
    private List<Integer> pcOnlyWeekdays = new ArrayList<>();
    private int cycleWeeks = 1;
    private List<Integer> activeWeeksInCycle = new ArrayList<>(List.of(1));

    public TrainingPeriod() {}

    public TrainingPeriod(final String name, final LocalDate startDate, final LocalDate endDate) {
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public TrainingPeriod(final Long id, final String name, final LocalDate startDate, final LocalDate endDate) {
        this.id = id;
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(final LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(final LocalDate endDate) { this.endDate = endDate; }

    public List<Integer> getWeekdays() { return weekdays; }
    public void setWeekdays(final List<Integer> weekdays) { this.weekdays = weekdays != null ? weekdays : new ArrayList<>(); }
    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(final String location) { this.location = location; }

    public Map<Integer, String> getWeekdayLocations() { return weekdayLocations; }
    public void setWeekdayLocations(final Map<Integer, String> weekdayLocations) {
        this.weekdayLocations = weekdayLocations != null ? weekdayLocations : new LinkedHashMap<>();
    }

    /**
     * Der Ort fuer einen Wochentag: der eigene, sonst der der Periode.
     *
     * Die Rueckfall-Regel steht HIER und nirgends sonst. Wer sie an jeder Aufrufstelle neu
     * schreibt, hat sie beim naechsten Mal an einer Stelle vergessen — und dann stuende an
     * einem Termin kein Ort, obwohl die Periode einen hat.
     */
    public String ortFuer(final int isoWochentag) {
        final String eigener = weekdayLocations.get(isoWochentag);
        return eigener != null && !eigener.isBlank() ? eigener : location;
    }

    public Map<Integer, String> getWeekdayTimes() { return weekdayTimes; }
    public void setWeekdayTimes(final Map<Integer, String> weekdayTimes) { this.weekdayTimes = weekdayTimes != null ? weekdayTimes : new LinkedHashMap<>(); }

    public List<Integer> getPcOnlyWeekdays() { return pcOnlyWeekdays; }
    public void setPcOnlyWeekdays(final List<Integer> pcOnlyWeekdays) { this.pcOnlyWeekdays = pcOnlyWeekdays != null ? pcOnlyWeekdays : new ArrayList<>(); }

    /** Ist an diesem Wochentag der ganze Kader eingeladen? */
    public boolean isOpenToAllOn(final int isoWeekday) { return !pcOnlyWeekdays.contains(isoWeekday); }

    public int getCycleWeeks() { return cycleWeeks; }
    public void setCycleWeeks(final int cycleWeeks) { this.cycleWeeks = cycleWeeks; }
    public List<Integer> getActiveWeeksInCycle() { return activeWeeksInCycle; }
    public void setActiveWeeksInCycle(final List<Integer> activeWeeksInCycle) {
        this.activeWeeksInCycle = (activeWeeksInCycle != null && !activeWeeksInCycle.isEmpty())
            ? new ArrayList<>(activeWeeksInCycle) : new ArrayList<>(List.of(1));
    }
}
