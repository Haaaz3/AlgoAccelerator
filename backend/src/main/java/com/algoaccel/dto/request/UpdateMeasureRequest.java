package com.algoaccel.dto.request;

import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating a measure.
 * All fields are optional for partial updates.
 */
public record UpdateMeasureRequest(
    @Size(max = 100)
    String measureId,

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

    String status,

    String overallConfidence
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
