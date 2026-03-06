package com.algoaccel.hcc.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO for HCC suppression status.
 */
@Data
@Builder
public class HccSuppressionStatusDto {
    private String patientId;
    private String targetHcc;
    private String modelType;
    private String status;
    private boolean isSuppressed;
}
