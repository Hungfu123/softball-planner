package com.softball.adapter.dto;

import com.softball.domain.model.CoachBillingProfile;

import java.math.BigDecimal;

public record CoachBillingProfileResponse(
    String firstName,
    String lastName,
    String street,
    String zip,
    String city,
    String sportCourse,
    BigDecimal hourlyRate,
    int maxHours,
    String recipientName,
    String recipientEmail,
    String signaturePng
) {
    public static CoachBillingProfileResponse from(final CoachBillingProfile profile) {
        return new CoachBillingProfileResponse(
            profile.getFirstName(),
            profile.getLastName(),
            profile.getStreet(),
            profile.getZip(),
            profile.getCity(),
            profile.getSportCourse(),
            profile.getHourlyRate(),
            profile.getMaxHours(),
            profile.getRecipientName(),
            profile.getRecipientEmail(),
            profile.getSignaturePng()
        );
    }
}
