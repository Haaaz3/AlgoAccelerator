package com.algoaccel.hcc.controller;

import com.algoaccel.hcc.config.HccFeatureFlags;
import com.algoaccel.hcc.dto.SuspectEvaluationResult;
import com.algoaccel.hcc.service.SuspectEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for HCC suspect evaluation.
 */
@RestController
@RequestMapping("/api/hcc/evaluate")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "hcc.enabled", havingValue = "true", matchIfMissing = true)
public class HccEvaluationController {

    private final SuspectEvaluationService evaluationService;
    private final HccFeatureFlags featureFlags;

    /**
     * Evaluate a patient against an HCC suspecting rule.
     * Returns 503 Service Unavailable if resurfacing is disabled and the evaluation
     * would trigger resurfacing logic.
     */
    @GetMapping("/{ruleId}/{patientId}")
    public ResponseEntity<?> evaluate(
            @PathVariable Long ruleId,
            @PathVariable String patientId,
            @RequestParam(required = false) String clientId) {

        // Check if resurfacing feature is disabled
        if (!featureFlags.isResurfacingEnabled()) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ErrorResponse("HCC resurfacing is currently disabled"));
        }

        SuspectEvaluationResult result = evaluationService.evaluate(patientId, ruleId, clientId);
        return ResponseEntity.ok(result);
    }

    /**
     * Simple error response DTO.
     */
    private record ErrorResponse(String message) {}
}
