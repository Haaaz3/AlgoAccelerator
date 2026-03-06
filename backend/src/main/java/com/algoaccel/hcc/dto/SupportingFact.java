package com.algoaccel.hcc.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Represents a piece of clinical evidence that triggered a suspect condition.
 */
@Data
@Builder
public class SupportingFact {
    private String conceptAlias;
    private String evidenceType;   // LAB, MEDICATION, DIAGNOSIS
    private String description;
    private LocalDate evidenceDate;
    private String qualitativeResult;
    private String quantitativeResult;
}
