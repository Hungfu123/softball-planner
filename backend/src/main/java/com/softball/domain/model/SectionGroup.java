package com.softball.domain.model;

/**
 * Diskriminator für Sections wenn parallele Anfänger-Gruppe aktiviert ist.
 * - ALL: Section gilt für beide Gruppen (Warmup, Partner-Routine, Batting, Game)
 * - MAIN: Section nur für Hauptgruppe (Skill-Stations mit allen Komplexitäten)
 * - BEGINNER: Section nur für Anfänger (Skill-Stations mit complexity=BASIC, ~1.5x länger)
 */
public enum SectionGroup {
    ALL,
    MAIN,
    BEGINNER
}
