package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.CombinationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO for medication order data from patient data source.
 */
@Data
@Builder
public class MedicationOrderDto {
    private String patientId;
    private String conceptAlias;
    private LocalDate startDate;
    private CombinationType combinationType;
}
