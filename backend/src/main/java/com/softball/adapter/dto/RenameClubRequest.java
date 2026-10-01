package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

/** Club-Umbenennung im Team-Verzeichnis: benennt alle Liga-Zeilen dieses Clubs um. */
public record RenameClubRequest(
    @NotBlank String currentName,
    @NotBlank String newName
) {}
