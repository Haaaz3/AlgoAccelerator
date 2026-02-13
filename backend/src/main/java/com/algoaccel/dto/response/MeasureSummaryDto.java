package com.algoaccel.dto.response;

import java.time.LocalDateTime;

/**
 * Lightweight measure summary for list views.
 */
public record MeasureSummaryDto(
    String id,
    String measureId,
    String title,
    String program,
    String status,
    int populationCount,
    LocalDateTime updatedAt
) {}
