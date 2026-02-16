package com.algoaccel.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for LLM providers.
 * API keys are read from environment variables for security.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "llm")
public class LlmConfig {

    /**
     * Default provider to use (anthropic, openai, google, custom)
     */
    private String defaultProvider = "anthropic";

    /**
     * Anthropic (Claude) configuration
     */
    private AnthropicConfig anthropic = new AnthropicConfig();

    /**
     * OpenAI (GPT) configuration
     */
    private OpenAiConfig openai = new OpenAiConfig();

    /**
     * Google (Gemini) configuration
     */
    private GoogleConfig google = new GoogleConfig();

    /**
     * Custom/Local LLM configuration (OpenAI-compatible API)
     */
    private CustomConfig custom = new CustomConfig();

    @Data
    public static class AnthropicConfig {
        private String apiKey;
        private String defaultModel = "claude-sonnet-4-20250514";
        private String apiUrl = "https://api.anthropic.com/v1/messages";
    }

    @Data
    public static class OpenAiConfig {
        private String apiKey;
        private String defaultModel = "gpt-4o";
        private String apiUrl = "https://api.openai.com/v1/chat/completions";
    }

    @Data
    public static class GoogleConfig {
        private String apiKey;
        private String defaultModel = "gemini-1.5-pro";
        private String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    }

    @Data
    public static class CustomConfig {
        private String apiKey;
        private String modelName = "llama2";
        private String baseUrl = "http://localhost:11434/v1";
    }

    /**
     * Get API key for a provider
     */
    public String getApiKey(String provider) {
        return switch (provider.toLowerCase()) {
            case "anthropic" -> anthropic.getApiKey();
            case "openai" -> openai.getApiKey();
            case "google" -> google.getApiKey();
            case "custom" -> custom.getApiKey();
            default -> null;
        };
    }

    /**
     * Get default model for a provider
     */
    public String getDefaultModel(String provider) {
        return switch (provider.toLowerCase()) {
            case "anthropic" -> anthropic.getDefaultModel();
            case "openai" -> openai.getDefaultModel();
            case "google" -> google.getDefaultModel();
            case "custom" -> custom.getModelName();
            default -> null;
        };
    }

    /**
     * Check if a provider is configured (has API key or is custom with base URL)
     */
    public boolean isProviderConfigured(String provider) {
        return switch (provider.toLowerCase()) {
            case "anthropic" -> anthropic.getApiKey() != null && !anthropic.getApiKey().isBlank();
            case "openai" -> openai.getApiKey() != null && !openai.getApiKey().isBlank();
            case "google" -> google.getApiKey() != null && !google.getApiKey().isBlank();
            case "custom" -> custom.getBaseUrl() != null && !custom.getBaseUrl().isBlank();
            default -> false;
        };
    }
}
