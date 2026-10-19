package com.softball.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateCoachBillingProfileRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank String street,
    @NotBlank String zip,
    @NotBlank String city,
    @NotBlank String sportCourse,
    @NotNull @DecimalMin("0.0") BigDecimal hourlyRate,
    @Min(1) @Max(200) int maxHours,
    /** Anrede in der Mail; leer heisst nur "Hallo,". */
    String recipientName,
    @NotBlank @Email String recipientEmail,
    /** PNG als Data-URL; null loescht die hinterlegte Unterschrift. */
    String signaturePng
) {
}
