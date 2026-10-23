package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** bcrypt wertet nur die ersten 72 Zeichen aus; mehr anzunehmen taeuschte eine Sicherheit vor, die es nicht gibt. */
public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 72, message = "muss zwischen 8 und 72 Zeichen lang sein") String newPassword
) {}
