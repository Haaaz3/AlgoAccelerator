package com.algoaccel.hcc.service;

import com.algoaccel.hcc.model.HccRuleRejectionState;
import com.algoaccel.hcc.port.PatientDataPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service for determining whether a previously rejected suspect should resurface.
 *
 * Resurfacing logic: After a clinician rejects a suspect condition, it stays suppressed
 * unless a *different* medication concept (not a new start date for the same medication)
 * appears within the measurement period.
 */
@Service
@RequiredArgsConstructor
public class RejectionResurfacingService {

    private final PatientDataPort patientDataPort;

    /**
     * Determines if a suspect should surface based on rejection history and current evidence.
     *
     * @param patientId The patient identifier
     * @param ruleId The HCC rule identifier
     * @param modelType The HCC model type (CMS, HHS, ESRD)
     * @param currentConceptAliases The concept aliases present in current evaluation
     * @return true if the suspect should surface, false if it should stay suppressed
     */
    public boolean shouldSurface(String patientId, Long ruleId, String modelType, List<String> currentConceptAliases) {
        // Get rejection state for this patient/rule/model
        Optional<HccRuleRejectionState> rejectionStateOpt =
                patientDataPort.getRejectionState(patientId, ruleId, modelType);

        // Scenario (a): No prior rejection exists → surface
        if (rejectionStateOpt.isEmpty()) {
            return true;
        }

        HccRuleRejectionState rejectionState = rejectionStateOpt.get();
        String lastTriggeringConcept = rejectionState.getLastTriggeringConceptAlias();

        // If no current concepts, nothing to trigger resurfacing
        if (currentConceptAliases == null || currentConceptAliases.isEmpty()) {
            return false;
        }

        // Scenario (c): Check if any current concept differs from the last triggering concept
        // If a different concept is present → resurface
        for (String currentConcept : currentConceptAliases) {
            if (!currentConcept.equals(lastTriggeringConcept)) {
                return true;
            }
        }

        // Scenario (b): All current concepts match the last triggering concept → stay suppressed
        return false;
    }
}
