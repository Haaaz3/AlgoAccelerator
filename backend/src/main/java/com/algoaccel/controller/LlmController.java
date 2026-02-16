package com.algoaccel.controller;

import com.algoaccel.config.LlmConfig;
import com.algoaccel.dto.request.LlmRequest;
import com.algoaccel.dto.response.LlmResponseDto;
import com.algoaccel.service.llm.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for LLM operations.
 * Routes LLM calls through the backend to keep API keys secure.
 */
@RestController
@RequestMapping("/api/llm")
@RequiredArgsConstructor
@Slf4j
public class LlmController {

    private final LlmService llmService;
    private final LlmConfig llmConfig;

    /**
     * Get available LLM providers and their configuration status.
     */
    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> getProviders() {
        Map<String, Object> response = new HashMap<>();

        List<String> providers = List.of("anthropic", "openai", "google", "custom");
        List<Map<String, Object>> providerList = providers.stream()
                .map(provider -> {
                    Map<String, Object> info = new HashMap<>();
                    info.put("id", provider);
                    info.put("configured", llmConfig.isProviderConfigured(provider));
                    info.put("defaultModel", llmConfig.getDefaultModel(provider));
                    return info;
                })
                .toList();

        response.put("providers", providerList);
        response.put("defaultProvider", llmConfig.getDefaultProvider());

        return ResponseEntity.ok(response);
    }

    /**
     * Call an LLM for general text completion.
     * This is a generic endpoint that can be used for various LLM tasks.
     */
    @PostMapping("/complete")
    public Mono<ResponseEntity<LlmResponseDto>> complete(@RequestBody LlmRequest request) {
        String provider = request.getProvider() != null ? request.getProvider() : llmConfig.getDefaultProvider();
        String model = request.getModel() != null ? request.getModel() : llmConfig.getDefaultModel(provider);

        log.info("LLM complete request: provider={}, model={}", provider, model);

        return llmService.callLlm(
                        provider,
                        model,
                        request.getSystemPrompt(),
                        request.getUserPrompt(),
                        request.getImages(),
                        request.getMaxTokens()
                )
                .map(response -> ResponseEntity.ok(new LlmResponseDto(
                        response.content(),
                        response.tokensUsed(),
                        provider,
                        model
                )))
                .onErrorResume(e -> {
                    log.error("LLM complete error", e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(new LlmResponseDto(
                                    "Error: " + e.getMessage(),
                                    0,
                                    provider,
                                    model
                            )));
                });
    }

    /**
     * Extract measure data from document content using AI.
     * Specialized endpoint for measure PDF/document extraction.
     */
    @PostMapping("/extract")
    public Mono<ResponseEntity<LlmResponseDto>> extractMeasure(@RequestBody LlmRequest request) {
        String provider = request.getProvider() != null ? request.getProvider() : llmConfig.getDefaultProvider();
        String model = request.getModel() != null ? request.getModel() : llmConfig.getDefaultModel(provider);

        log.info("LLM extract request: provider={}, model={}, hasImages={}",
                provider, model, request.getImages() != null && !request.getImages().isEmpty());

        // Use higher token limit for extraction
        int maxTokens = request.getMaxTokens() != null ? request.getMaxTokens() : 16000;

        return llmService.callLlm(
                        provider,
                        model,
                        request.getSystemPrompt(),
                        request.getUserPrompt(),
                        request.getImages(),
                        maxTokens
                )
                .map(response -> ResponseEntity.ok(new LlmResponseDto(
                        response.content(),
                        response.tokensUsed(),
                        provider,
                        model
                )))
                .onErrorResume(e -> {
                    log.error("LLM extract error", e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(new LlmResponseDto(
                                    "Error: " + e.getMessage(),
                                    0,
                                    provider,
                                    model
                            )));
                });
    }

    /**
     * AI assistant for measure editing.
     * Specialized endpoint for the AI chat assistant in the UMS editor.
     */
    @PostMapping("/assist")
    public Mono<ResponseEntity<LlmResponseDto>> assist(@RequestBody LlmRequest request) {
        String provider = request.getProvider() != null ? request.getProvider() : llmConfig.getDefaultProvider();
        String model = request.getModel() != null ? request.getModel() : llmConfig.getDefaultModel(provider);

        log.info("LLM assist request: provider={}, model={}", provider, model);

        return llmService.callLlm(
                        provider,
                        model,
                        request.getSystemPrompt(),
                        request.getUserPrompt(),
                        null, // No images for assistant
                        request.getMaxTokens() != null ? request.getMaxTokens() : 4000
                )
                .map(response -> ResponseEntity.ok(new LlmResponseDto(
                        response.content(),
                        response.tokensUsed(),
                        provider,
                        model
                )))
                .onErrorResume(e -> {
                    log.error("LLM assist error", e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(new LlmResponseDto(
                                    "Error: " + e.getMessage(),
                                    0,
                                    provider,
                                    model
                            )));
                });
    }
}
