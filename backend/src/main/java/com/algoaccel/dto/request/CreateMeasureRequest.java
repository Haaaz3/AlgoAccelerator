package com.algoaccel.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a new measure.
 */
public record CreateMeasureRequest(
    @NotBlank(message = "Measure ID is required")
    @Size(max = 100)
    String measureId,

    @NotBlank(message = "Title is required")
    @Size(max = 500)
    String title,

    @Size(max = 50)
    String version,

    @Size(max = 255)
    String steward,

    String program,

    @Size(max = 50)
    String measureType,

    String description,

    String rationale,

    String clinicalRecommendation,

    String periodStart,

    String periodEnd,

    GlobalConstraintsRequest globalConstraints,

    String status
) {
    public record GlobalConstraintsRequest(
        Integer ageMin,
        Integer ageMax,
        String ageCalculation,
        String gender,
        String measurementPeriodType,
        String measurementPeriodAnchor
    ) {}
}
