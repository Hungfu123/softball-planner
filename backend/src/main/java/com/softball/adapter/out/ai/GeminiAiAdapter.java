package com.softball.adapter.out.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softball.domain.model.Drill;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanRequest;
import com.softball.domain.port.out.AiTrainingPlanPort;
import com.softball.shared.exception.AiServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "feature.ai.enabled", havingValue = "true", matchIfMissing = false)
public class GeminiAiAdapter implements AiTrainingPlanPort {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiAdapter.class);

    private final ChatClient chatClient;
    private final String refinePromptTemplate;
    private final ObjectMapper objectMapper;

    public GeminiAiAdapter(final ChatClient.Builder chatClientBuilder,
                           @Value("classpath:prompts/training-plan-system.txt") final Resource systemPromptResource,
                           @Value("classpath:prompts/training-plan-refine.txt") final Resource refinePromptResource,
                           final ObjectMapper objectMapper) throws IOException {
        final String systemPrompt = systemPromptResource.getContentAsString(StandardCharsets.UTF_8);
        this.refinePromptTemplate = refinePromptResource.getContentAsString(StandardCharsets.UTF_8);
        this.objectMapper = objectMapper;
        this.chatClient = chatClientBuilder
                .defaultSystem(systemPrompt)
                .build();
    }

    @Override
    public TrainingPlanContent generate(final TrainingPlanRequest request) {
        try {
            final String userPrompt = buildGeneratePrompt(request);
            log.info("Generating training plan: {} players, focus={}, {}min",
                    request.getPlayerCount(), request.getFocus(), request.getDurationMinutes());

            return chatClient.prompt()
                    .user(userPrompt)
                    .call()
                    .entity(TrainingPlanContent.class);
        } catch (final Exception e) {
            log.error("AI training plan generation failed: {}", e.getMessage());
            throw new AiServiceException("KI-Trainingsplan nicht verfügbar: " + e.getMessage(), 503, e);
        }
    }

    @Override
    public TrainingPlanContent refine(final TrainingPlan existingPlan, final String userEdits) {
        try {
            final String existingPlanJson = objectMapper.writeValueAsString(existingPlan.getContent());
            final String userPrompt = refinePromptTemplate
                    .replace("{existingPlan}", existingPlanJson)
                    .replace("{userEdits}", userEdits);

            log.info("Refining training plan id={}", existingPlan.getId());

            return chatClient.prompt()
                    .user(userPrompt)
                    .call()
                    .entity(TrainingPlanContent.class);
        } catch (final JsonProcessingException e) {
            throw new AiServiceException("Plan-Serialisierung fehlgeschlagen: " + e.getMessage(), 503, e);
        } catch (final Exception e) {
            log.error("AI training plan refinement failed: {}", e.getMessage());
            throw new AiServiceException("KI-Aufbereitung fehlgeschlagen: " + e.getMessage(), 503, e);
        }
    }

    private String buildGeneratePrompt(final TrainingPlanRequest request) {
        final String drillList = request.getAvailableDrills().stream()
                .map(this::formatDrill)
                .collect(Collectors.joining("\n"));

        return String.format("""
                Erstelle einen Trainingsplan mit folgenden Vorgaben:

                - Spieleranzahl: %d
                - Schwerpunkt: %s
                - Dauer: %d Minuten

                Verfügbare Drills:
                %s
                """,
                request.getPlayerCount(),
                request.getFocus(),
                request.getDurationMinutes(),
                drillList
        );
    }

    private String formatDrill(final Drill drill) {
        return String.format("- %s (ID: %s, Min. Spieler: %d, Kategorien: %s): %s",
                drill.getName(),
                drill.getId(),
                drill.getMinPlayers(),
                drill.getCategories().toString(),
                drill.getDescription()
        );
    }
}
