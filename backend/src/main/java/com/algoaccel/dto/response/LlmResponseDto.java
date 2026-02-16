package com.algoaccel.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for LLM API calls.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LlmResponseDto {
    /**
     * The generated content from the LLM.
     */
    private String content;

    /**
     * Total tokens used (input + output).
     */
    private Integer tokensUsed;

    /**
     * The provider that was used.
     */
    private String provider;

    /**
     * The model that was used.
     */
    private String model;
}
