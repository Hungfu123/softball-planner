package com.softball.domain.model;

public record WhatsappAccountStatus(boolean connected, String number, boolean needsQr, String qr) {}
