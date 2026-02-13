package com.algoaccel.dto.response;

import java.util.List;

/**
 * Evaluation trace per test patient per population.
 */
public record ValidationTraceDto(
    String patientId,
    String patientName,
    String patientGender,
    String narrative,
    String finalOutcome,
    List<PreCheckResultDto> preCheckResults,
    List<PopulationResultDto> populationResults,
    List<String> howClose
) {
    public record PreCheckResultDto(
        String checkType,
        boolean met,
        String description
    ) {}

    public record PopulationResultDto(
        String populationType,
        boolean met,
        List<ValidationNodeDto> nodes
    ) {}

    public record ValidationNodeDto(
        String id,
        String title,
        String type,
        String description,
        String status,
        List<ValidationFactDto> facts,
        List<ValidationNodeDto> children
    ) {}

    public record ValidationFactDto(
        String code,
        String display,
        String date,
        String source
    ) {}
}
