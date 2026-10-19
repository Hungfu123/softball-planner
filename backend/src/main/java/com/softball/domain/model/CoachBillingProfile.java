package com.softball.domain.model;

import java.math.BigDecimal;

/**
 * Stammdaten des Uebungsleiters fuer die Abrechnung beim Hochschulsport.
 *
 * Genau eine Zeile (id = 1) — die App plant ein Team und rechnet fuer einen Trainer ab.
 * Die Felder sind die, die auf dem Bogen von Hand ausgefuellt wurden; was sich Monat
 * fuer Monat aendert (Datum, Stunden), steht hier bewusst nicht.
 */
public class CoachBillingProfile {

    /** Die eine Zeile. Der Bogen kennt keinen zweiten Trainer. */
    public static final Long SINGLETON_ID = 1L;

    private String firstName;
    private String lastName;
    private String street;
    private String zip;
    private String city;
    private String sportCourse;
    private BigDecimal hourlyRate;
    private int maxHours;
    private String recipientName;
    private String recipientEmail;
    private String signaturePng;

    public CoachBillingProfile() {}

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
