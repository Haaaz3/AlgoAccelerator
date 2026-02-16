package com.algoaccel.service.llm;

import com.algoaccel.config.LlmConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * Service for calling LLM providers (Anthropic, OpenAI, Google, Custom).
 * Handles all LLM API communication server-side to keep API keys secure.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlmService {

    private final LlmConfig llmConfig;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    /**
     * Call an LLM with the given parameters.
     *
     * @param provider The LLM provider (anthropic, openai, google, custom)
     * @param model The model to use (or null for default)
     * @param systemPrompt The system prompt
     * @param userPrompt The user prompt
     * @param images Base64 encoded images for vision (optional)
     * @param maxTokens Maximum tokens to generate
     * @return The LLM response content
     */
    public Mono<LlmResponse> callLlm(
            String provider,
            String model,
            String systemPrompt,
            String userPrompt,
            List<String> images,
            Integer maxTokens
    ) {
        String effectiveProvider = provider != null ? provider : llmConfig.getDefaultProvider();
        String effectiveModel = model != null ? model : llmConfig.getDefaultModel(effectiveProvider);
        int effectiveMaxTokens = maxTokens != null ? maxTokens : 8000;

        log.info("Calling LLM: provider={}, model={}, maxTokens={}, hasImages={}",
                effectiveProvider, effectiveModel, effectiveMaxTokens, images != null && !images.isEmpty());

        return switch (effectiveProvider.toLowerCase()) {
            case "anthropic" -> callAnthropic(effectiveModel, systemPrompt, userPrompt, images, effectiveMaxTokens);
            case "openai" -> callOpenAi(effectiveModel, systemPrompt, userPrompt, images, effectiveMaxTokens);
            case "google" -> callGoogle(effectiveModel, systemPrompt, userPrompt, images, effectiveMaxTokens);
            case "custom" -> callCustom(effectiveModel, systemPrompt, userPrompt, effectiveMaxTokens);
            default -> Mono.error(new IllegalArgumentException("Unknown provider: " + effectiveProvider));
        };
    }

    /**
     * Call Anthropic (Claude) API
     */
    private Mono<LlmResponse> callAnthropic(
            String model,
            String systemPrompt,
            String userPrompt,
            List<String> images,
            int maxTokens
    ) {
        String apiKey = llmConfig.getAnthropic().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return Mono.error(new IllegalStateException("Anthropic API key not configured"));
        }

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("system", systemPrompt);

        // Build messages array
        ArrayNode messages = requestBody.putArray("messages");
        ObjectNode userMessage = messages.addObject();
        userMessage.put("role", "user");

        // Handle vision (images) if present
        if (images != null && !images.isEmpty()) {
            ArrayNode content = userMessage.putArray("content");
            for (String imageBase64 : images) {
                ObjectNode imageBlock = content.addObject();
                imageBlock.put("type", "image");
                ObjectNode source = imageBlock.putObject("source");
                source.put("type", "base64");
                source.put("media_type", "image/png");
                source.put("data", imageBase64);
            }
            ObjectNode textBlock = content.addObject();
            textBlock.put("type", "text");
            textBlock.put("text", userPrompt);
        } else {
            userMessage.put("content", userPrompt);
        }

        return webClientBuilder.build()
                .post()
                .uri(llmConfig.getAnthropic().getApiUrl())
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    String content = response.path("content").path(0).path("text").asText("");
                    int inputTokens = response.path("usage").path("input_tokens").asInt(0);
                    int outputTokens = response.path("usage").path("output_tokens").asInt(0);
                    return new LlmResponse(content, inputTokens + outputTokens);
                })
                .doOnError(e -> log.error("Anthropic API error", e));
    }

    /**
     * Call OpenAI (GPT) API
     */
    private Mono<LlmResponse> callOpenAi(
            String model,
            String systemPrompt,
            String userPrompt,
            List<String> images,
            int maxTokens
    ) {
        String apiKey = llmConfig.getOpenai().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return Mono.error(new IllegalStateException("OpenAI API key not configured"));
        }

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);

        ArrayNode messages = requestBody.putArray("messages");

        // System message
        ObjectNode systemMessage = messages.addObject();
        systemMessage.put("role", "system");
        systemMessage.put("content", systemPrompt);

        // User message with optional images
        ObjectNode userMessage = messages.addObject();
        userMessage.put("role", "user");

        if (images != null && !images.isEmpty()) {
            ArrayNode content = userMessage.putArray("content");
            for (String imageBase64 : images) {
                ObjectNode imageBlock = content.addObject();
                imageBlock.put("type", "image_url");
                ObjectNode imageUrl = imageBlock.putObject("image_url");
                imageUrl.put("url", "data:image/png;base64," + imageBase64);
                imageUrl.put("detail", "high");
            }
            ObjectNode textBlock = content.addObject();
            textBlock.put("type", "text");
            textBlock.put("text", userPrompt);
        } else {
            userMessage.put("content", userPrompt);
        }

        // Request JSON response format
        ObjectNode responseFormat = requestBody.putObject("response_format");
        responseFormat.put("type", "json_object");

        return webClientBuilder.build()
                .post()
                .uri(llmConfig.getOpenai().getApiUrl())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    String content = response.path("choices").path(0).path("message").path("content").asText("");
                    int promptTokens = response.path("usage").path("prompt_tokens").asInt(0);
                    int completionTokens = response.path("usage").path("completion_tokens").asInt(0);
                    return new LlmResponse(content, promptTokens + completionTokens);
                })
                .doOnError(e -> log.error("OpenAI API error", e));
    }

    /**
     * Call Google (Gemini) API
     */
    private Mono<LlmResponse> callGoogle(
            String model,
            String systemPrompt,
            String userPrompt,
            List<String> images,
            int maxTokens
    ) {
        String apiKey = llmConfig.getGoogle().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return Mono.error(new IllegalStateException("Google API key not configured"));
        }

        String url = llmConfig.getGoogle().getApiUrl() + "/" + model + ":generateContent?key=" + apiKey;

        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode contents = requestBody.putArray("contents");
        ObjectNode contentObj = contents.addObject();
        ArrayNode parts = contentObj.putArray("parts");

        // Add images if present
        if (images != null && !images.isEmpty()) {
            for (String imageBase64 : images) {
                ObjectNode imagePart = parts.addObject();
                ObjectNode inlineData = imagePart.putObject("inline_data");
                inlineData.put("mime_type", "image/png");
                inlineData.put("data", imageBase64);
            }
        }

        // Add text (system + user prompt combined for Gemini)
        ObjectNode textPart = parts.addObject();
        textPart.put("text", systemPrompt + "\n\n" + userPrompt);

        // Generation config
        ObjectNode generationConfig = requestBody.putObject("generationConfig");
        generationConfig.put("maxOutputTokens", maxTokens);
        generationConfig.put("responseMimeType", "application/json");

        return webClientBuilder.build()
                .post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    String content = response.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
                    int totalTokens = response.path("usageMetadata").path("totalTokenCount").asInt(0);
                    return new LlmResponse(content, totalTokens);
                })
                .doOnError(e -> log.error("Google API error", e));
    }

    /**
     * Call Custom/Local LLM (OpenAI-compatible API)
     */
    private Mono<LlmResponse> callCustom(
            String model,
            String systemPrompt,
            String userPrompt,
            int maxTokens
    ) {
        String baseUrl = llmConfig.getCustom().getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return Mono.error(new IllegalStateException("Custom LLM base URL not configured"));
        }

        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        String apiKey = llmConfig.getCustom().getApiKey();

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);

        ArrayNode messages = requestBody.putArray("messages");
        ObjectNode systemMessage = messages.addObject();
        systemMessage.put("role", "system");
        systemMessage.put("content", systemPrompt);

        ObjectNode userMessage = messages.addObject();
        userMessage.put("role", "user");
        userMessage.put("content", userPrompt);

        WebClient.RequestBodySpec request = webClientBuilder.build()
                .post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON);

        if (apiKey != null && !apiKey.isBlank()) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        }

        return request
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    String content = response.path("choices").path(0).path("message").path("content").asText("");
                    int promptTokens = response.path("usage").path("prompt_tokens").asInt(0);
                    int completionTokens = response.path("usage").path("completion_tokens").asInt(0);
                    return new LlmResponse(content, promptTokens + completionTokens);
                })
                .doOnError(e -> log.error("Custom LLM API error", e));
    }

    /**
     * LLM response record
     */
    public record LlmResponse(String content, int tokensUsed) {}
}
