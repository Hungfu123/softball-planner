package com.softball.adapter.dto;

import com.softball.domain.model.YearCopyResult;

import java.util.List;

/** Ergebnis des "Jahr übernehmen"-Laufs: welche Ligen neu angelegt, welche übersprungen wurden. */
public record YearCopyResponse(
    int templateYear,
    int targetYear,
    List<String> createdSeasons,
    List<String> skippedSeasons,
    int copiedTeams
) {
    public static YearCopyResponse from(final YearCopyResult result) {
        return new YearCopyResponse(
            result.templateYear(), result.targetYear(),
            result.createdSeasons(), result.skippedSeasons(), result.copiedTeams());
    }
}
