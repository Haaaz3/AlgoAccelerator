package com.algoaccel.dto.request;

import lombok.Data;

import java.util.List;

/**
 * Request DTO for LLM API calls.
 */
@Data
public class LlmRequest {
    /**
     * The LLM provider to use (anthropic, openai, google, custom).
     * If null, uses the server's default provider.
     */
    private String provider;

    /**
     * The model to use. If null, uses the provider's default model.
     */
    private String model;

    /**
     * System prompt for the LLM.
     */
    private String systemPrompt;

    /**
     * User prompt / content to process.
     */
    private String userPrompt;

    /**
     * Base64 encoded images for vision-based extraction (optional).
     */
    private List<String> images;

    /**
     * Maximum tokens to generate.
     */
    private Integer maxTokens;
}
