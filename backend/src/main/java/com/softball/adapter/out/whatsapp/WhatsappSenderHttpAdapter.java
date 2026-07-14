package com.softball.adapter.out.whatsapp;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
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
            if (s == null) return new WhatsappAccountStatus(false, null, false, null);
            return new WhatsappAccountStatus(s.connected(), s.number(), s.needsQr(), null);
        } catch (final Exception e) {
            log.warn("WhatsApp-Status nicht erreichbar: {}", e.getMessage());
            return new WhatsappAccountStatus(false, null, false, null);
        }
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
    public void sendPoll(final String groupId, final String title, final List<String> options,
                         final boolean allowMultipleAnswers, final String message) {
        try {
            final Map<String, Object> body = new HashMap<>();
            body.put("groupId", groupId);
            body.put("title", title);
            body.put("options", options);
            body.put("allowMultiple", allowMultipleAnswers);
            body.put("message", message);
            client.post().uri("/send-poll")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("WhatsApp-Poll gesendet: '{}' -> {}", title, groupId);
        } catch (final Exception e) {
            log.warn("WhatsApp-Poll senden fehlgeschlagen ({} -> {}): {}", title, groupId, e.getMessage());
            throw new BusinessValidationException("WhatsApp-Poll konnte nicht gesendet werden: " + e.getMessage());
        }
    }

    private record StatusDto(boolean connected, String number, boolean needsQr) {}
    private record QrDto(String qr) {}
    private record GroupsDto(List<GroupDto> groups) {}
    private record GroupDto(String id, String name) {}
}
