package com.softball.domain.model;

/**
 * Zustand der WhatsApp-Kopplung.
 *
 * {@code state} unterscheidet die Fälle, die vorher alle als "nicht verbunden" aussahen:
 * Dienst nicht erreichbar, wartet auf QR, von WhatsApp abgemeldet. Ohne diese
 * Unterscheidung zeigt die UI einen Endlos-Spinner ohne Ursache.
 */
public record WhatsappAccountStatus(boolean connected, String number, String name, boolean needsQr, String qr,
                                    ConnectionState state, String lastError, String lastErrorAt,
                                    String lastPairingAt) {

    public enum ConnectionState {
        CONNECTING, WAITING_QR,
        /** Scan angenommen, Kopplung laeuft — scheitert sie danach, war der QR nicht das Problem. */
        PAIRING,
        CONNECTED, LOGGED_OUT, INIT_FAILED,
        /** Sidecar antwortet nicht (Container down, falscher Token, Netzwerk). */
        UNREACHABLE
    }

    /** Sidecar nicht erreichbar — Grund wird durchgereicht statt auf "nicht verbunden" geplättet. */
    public static WhatsappAccountStatus unreachable(final String reason) {
        return new WhatsappAccountStatus(false, null, null, false, null,
                ConnectionState.UNREACHABLE, reason, null, null);
    }
}
