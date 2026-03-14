package com.algoaccel.hcc.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for lab result data from patient data source.
 */
@Data
@Builder
public class LabResultDto {
    private String patientId;
    private String conceptAlias;
    private LocalDate resultDate;
    private String qualitativeResult;
    private BigDecimal quantitativeResult;
}
