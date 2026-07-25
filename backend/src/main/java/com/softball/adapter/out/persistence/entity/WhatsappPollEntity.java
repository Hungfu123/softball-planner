package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "whatsapp_polls")
public class WhatsappPollEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false, length = 120)
    private String groupId;

    @Column(name = "group_name", length = 200)
    private String groupName;

    @Column(nullable = false, length = 200)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String options = "[]";

    @Column(length = 10)
    private String weekday;

    @Column(name = "send_time", nullable = false)
    private LocalTime sendTime;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "allow_multiple_answers", nullable = false)
    private boolean allowMultipleAnswers = false;

    @Column(columnDefinition = "text")
    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skip_dates", columnDefinition = "jsonb", nullable = false)
    private String skipDates = "[]";

    @Column(name = "last_sent_at")
    private LocalDateTime lastSentAt;

    @Column(name = "last_sent_message_id", length = 255)
    private String lastSentMessageId;

    @Column(name = "last_sent_training_id")
    private Long lastSentTrainingId;

    @Column(name = "training_coupled", nullable = false)
    private boolean trainingCoupled = false;

    @Column(name = "send_date")
    private java.time.LocalDate sendDate;

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getGroupId() { return groupId; }
    public void setGroupId(final String v) { this.groupId = v; }
    public String getGroupName() { return groupName; }
    public void setGroupName(final String v) { this.groupName = v; }
    public String getTitle() { return title; }
    public void setTitle(final String v) { this.title = v; }
    public String getOptions() { return options; }
    public void setOptions(final String v) { this.options = v; }
    public String getWeekday() { return weekday; }
    public void setWeekday(final String v) { this.weekday = v; }
    public LocalTime getSendTime() { return sendTime; }
    public void setSendTime(final LocalTime v) { this.sendTime = v; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(final boolean v) { this.enabled = v; }
    public boolean isAllowMultipleAnswers() { return allowMultipleAnswers; }
    public void setAllowMultipleAnswers(final boolean v) { this.allowMultipleAnswers = v; }
    public String getMessage() { return message; }
    public void setMessage(final String v) { this.message = v; }
    public String getSkipDates() { return skipDates; }
    public void setSkipDates(final String v) { this.skipDates = v; }
    public LocalDateTime getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(final LocalDateTime v) { this.lastSentAt = v; }
    public String getLastSentMessageId() { return lastSentMessageId; }
    public void setLastSentMessageId(final String v) { this.lastSentMessageId = v; }
    public Long getLastSentTrainingId() { return lastSentTrainingId; }
    public void setLastSentTrainingId(final Long v) { this.lastSentTrainingId = v; }
    public boolean isTrainingCoupled() { return trainingCoupled; }
    public void setTrainingCoupled(final boolean v) { this.trainingCoupled = v; }
    public java.time.LocalDate getSendDate() { return sendDate; }
    public void setSendDate(final java.time.LocalDate v) { this.sendDate = v; }
}
