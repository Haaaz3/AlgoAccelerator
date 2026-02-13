package com.algoaccel.dto.response;

/**
 * Individual code in a value set.
 */
public record ValueSetCodeDto(
    String id,
    String code,
    String system,
    String display,
    String version
) {}
