package com.softball.adapter.out.whatsapp;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.model.WhatsappVote;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.shared.exception.BusinessValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Component
public class WhatsappSenderHttpAdapter implements WhatsappSender {

    private static final Logger log = LoggerFactory.getLogger(WhatsappSenderHttpAdapter.class);

    private final RestClient client;

    public WhatsappSenderHttpAdapter(
            final RestClient.Builder builder,
            @Value("${whatsapp.service.url:http://localhost:3000}") final String baseUrl,
            @Value("${whatsapp.service.token:}") final String token) {
        this.client = builder
                .baseUrl(baseUrl)
                .defaultHeader("X-Service-Token", token)
                .build();
    }

    @Override
    public WhatsappAccountStatus status() {
        try {
            final StatusDto s = client.get().uri("/status").retrieve().body(StatusDto.class);
            if (s == null) return WhatsappAccountStatus.unreachable("Sidecar antwortet mit leerem Body");
            return new WhatsappAccountStatus(s.connected(), s.number(), s.name(), s.needsQr(), null,
                    parseState(s.state(), s.connected()), s.lastError(), s.lastErrorAt(), s.lastPairingAt());
        } catch (final Exception e) {
            log.warn("WhatsApp-Status nicht erreichbar: {}", e.getMessage());
            return WhatsappAccountStatus.unreachable(e.getMessage());
        }
    }

    /** Unbekannter/fehlender state (älterer Sidecar) → aus connected ableiten statt zu raten. */
    private static WhatsappAccountStatus.ConnectionState parseState(final String raw, final boolean connected) {
        if (raw != null) {
            try {
                return WhatsappAccountStatus.ConnectionState.valueOf(raw);
            } catch (final IllegalArgumentException ignored) {
                log.warn("Unbekannter WhatsApp-State vom Sidecar: {}", raw);
            }
        }
        return connected
                ? WhatsappAccountStatus.ConnectionState.CONNECTED
                : WhatsappAccountStatus.ConnectionState.CONNECTING;
    }

    @Override
    public String qr() {
        try {
            final QrDto q = client.get().uri("/qr").retrieve().body(QrDto.class);
            return q != null ? q.qr() : null;
        } catch (final Exception e) {
            log.warn("WhatsApp-QR nicht erreichbar: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public List<WhatsappGroup> listGroups() {
        try {
            final GroupsDto g = client.get().uri("/groups").retrieve().body(GroupsDto.class);
            if (g == null || g.groups() == null) return List.of();
            return g.groups().stream().map(x -> new WhatsappGroup(x.id(), x.name())).toList();
        } catch (final Exception e) {
            log.warn("WhatsApp-Gruppen nicht erreichbar: {}", e.getMessage());
            throw new BusinessValidationException("WhatsApp-Dienst nicht erreichbar oder nicht gekoppelt");
        }
    }

    @Override
    public String sendPoll(final String groupId, final String title, final List<String> options,
                           final boolean allowMultipleAnswers, final String message) {
        try {
            // WhatsApp erlaubt keine doppelten Poll-Optionen → hier defensiv deduplizieren
            // (deckt auch Alt-Einträge, die noch Duplikate gespeichert haben).
            final List<String> uniqueOptions = options == null ? List.of()
                    : options.stream().map(o -> o != null ? o.trim() : "").filter(o -> !o.isEmpty()).distinct().toList();
            final Map<String, Object> body = new HashMap<>();
            body.put("groupId", groupId);
            body.put("title", title);
            body.put("options", uniqueOptions);
            body.put("allowMultiple", allowMultipleAnswers);
            body.put("message", message);
            final SendResultDto result = client.post().uri("/send-poll")
                    .body(body)
                    .retrieve()
                    .body(SendResultDto.class);
            log.info("WhatsApp-Poll gesendet: '{}' -> {}", title, groupId);
            return result != null ? result.pollMessageId() : null;
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll senden fehlgeschlagen ({} -> {}): {}", title, groupId, e.getMessage());
            throw new BusinessValidationException("WhatsApp-Poll konnte nicht gesendet werden: " + e.getMessage());
        }
    }

    @Override
    public List<WhatsappVote> fetchVotes(final String msgId) {
        try {
            final VoteDto[] votes = client.get().uri("/poll-votes/{id}", msgId)
                    .retrieve().body(VoteDto[].class);
            if (votes == null) return List.of();
            return java.util.Arrays.stream(votes)
                    .map(v -> new WhatsappVote(v.voterName(), v.options() != null ? v.options() : List.of()))
                    .toList();
        } catch (final Exception e) {
            log.warn("WhatsApp-Stimmen nicht abrufbar ({}): {}", msgId, e.getMessage());
            return List.of();
        }
    }

    private record StatusDto(boolean connected, String number, String name, boolean needsQr,
                             String state, String lastError, String lastErrorAt, String lastPairingAt) {}
    private record QrDto(String qr) {}
    private record GroupsDto(List<GroupDto> groups) {}
    private record GroupDto(String id, String name) {}
    private record SendResultDto(boolean sent, String pollMessageId) {}
    private record VoteDto(String voterName, List<String> options) {}
}
