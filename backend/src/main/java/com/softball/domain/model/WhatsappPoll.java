package com.softball.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class WhatsappPoll {
    private Long id;
    private String groupId;
    private String groupName;
    private String title;
    private List<String> options = new ArrayList<>();
    private DayOfWeek weekday;
    private LocalTime time;
    private boolean enabled = true;
    private List<LocalDate> skipDates = new ArrayList<>();
    private LocalDateTime lastSentAt;

    public WhatsappPoll() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getGroupId() { return groupId; }
    public void setGroupId(final String v) { this.groupId = v; }
    public String getGroupName() { return groupName; }
    public void setGroupName(final String v) { this.groupName = v; }
    public String getTitle() { return title; }
    public void setTitle(final String v) { this.title = v; }
    public List<String> getOptions() { return options; }
    public void setOptions(final List<String> v) { this.options = v != null ? v : new ArrayList<>(); }
    public DayOfWeek getWeekday() { return weekday; }
    public void setWeekday(final DayOfWeek v) { this.weekday = v; }
    public LocalTime getTime() { return time; }
    public void setTime(final LocalTime v) { this.time = v; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(final boolean v) { this.enabled = v; }
    public List<LocalDate> getSkipDates() { return skipDates; }
    public void setSkipDates(final List<LocalDate> v) { this.skipDates = v != null ? v : new ArrayList<>(); }
    public LocalDateTime getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(final LocalDateTime v) { this.lastSentAt = v; }
}
