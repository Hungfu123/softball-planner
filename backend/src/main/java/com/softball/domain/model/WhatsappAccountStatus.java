package com.softball.domain.model;

public record WhatsappAccountStatus(boolean connected, String number, String name, boolean needsQr, String qr) {}
