package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "coach_billing_profile")
public class CoachBillingProfileEntity {

    /** Fest vergeben, nicht generiert: die Tabelle haelt genau eine Zeile. */
    @Id
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String street;

    @Column(nullable = false)
    private String zip;

    @Column(nullable = false)
    private String city;

    @Column(name = "sport_course", nullable = false)
    private String sportCourse;

    @Column(name = "hourly_rate", nullable = false)
    private BigDecimal hourlyRate;

    @Column(name = "max_hours", nullable = false)
    private int maxHours;

    @Column(name = "recipient_name")
    private String recipientName;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "signature_png", columnDefinition = "TEXT")
    private String signaturePng;

    public CoachBillingProfileEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(final String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(final String lastName) { this.lastName = lastName; }
    public String getStreet() { return street; }
    public void setStreet(final String street) { this.street = street; }
    public String getZip() { return zip; }
    public void setZip(final String zip) { this.zip = zip; }
    public String getCity() { return city; }
    public void setCity(final String city) { this.city = city; }
    public String getSportCourse() { return sportCourse; }
    public void setSportCourse(final String sportCourse) { this.sportCourse = sportCourse; }
    public BigDecimal getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(final BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; }
    public int getMaxHours() { return maxHours; }
    public void setMaxHours(final int maxHours) { this.maxHours = maxHours; }
    public String getRecipientName() { return recipientName; }
    public void setRecipientName(final String recipientName) { this.recipientName = recipientName; }
    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(final String recipientEmail) { this.recipientEmail = recipientEmail; }
    public String getSignaturePng() { return signaturePng; }
    public void setSignaturePng(final String signaturePng) { this.signaturePng = signaturePng; }
}
