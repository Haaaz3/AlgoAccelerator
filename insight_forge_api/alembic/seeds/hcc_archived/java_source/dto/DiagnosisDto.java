package com.algoaccel.hcc.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO for diagnosis data from patient data source.
 */
@Data
@Builder
public class DiagnosisDto {
    private String patientId;
    private String icdCode;
    private String hccCategory;
    private String modelType;
    private String suppressionStatus;
}
