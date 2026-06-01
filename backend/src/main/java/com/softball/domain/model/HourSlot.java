package com.softball.domain.model;

/** Stündlicher Wetter-Slot im Tagesablauf (temp °C gerundet, WMO-Code, Regen-%). */
public record HourSlot(int hour, int temp, int wmoCode, int precipitationProbabilityPct) {}
