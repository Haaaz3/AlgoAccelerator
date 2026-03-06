package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.HccModelType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Evaluation result for a single HCC model type.
 */
@Data
@Builder
public class ModelEvaluationResult {
    private HccModelType modelType;
    private String stratification;  // HIGHLY_SUSPECTED, MODERATELY_SUSPECTED, NOT_SUSPECTED
    private boolean suppressed;
    private String suppressionReason;
    private List<SupportingFact> supportingFacts;
    private List<String> firedBranchIds;
}
