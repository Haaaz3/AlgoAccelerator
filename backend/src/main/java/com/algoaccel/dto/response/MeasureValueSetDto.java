package com.algoaccel.dto.response;

import java.util.List;

/**
 * Measure value set DTO with codes.
 */
public record MeasureValueSetDto(
    String id,
    String oid,
    String url,
    String name,
    String version,
    String publisher,
    String purpose,
    String confidence,
    boolean verified,
    String source,
    List<ValueSetCodeDto> codes
) {}
