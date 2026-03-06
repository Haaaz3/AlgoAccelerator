package com.algoaccel.hcc.port;

import com.algoaccel.hcc.dto.DiagnosisDto;
import com.algoaccel.hcc.dto.HccSuppressionStatusDto;
import com.algoaccel.hcc.dto.LabResultDto;
import com.algoaccel.hcc.dto.MedicationOrderDto;
import com.algoaccel.hcc.model.HccRuleRejectionState;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Port interface for patient data access.
 * Implementations can be swapped (H2 for dev/test, Oracle HDI for production).
 */
public interface PatientDataPort {

    /**
     * Get lab results for a patient within a date window.
     */
    List<LabResultDto> getLabResults(String patientId, String conceptAlias, LocalDate windowStart, LocalDate windowEnd);

    /**
     * Get medication orders for a patient matching any of the given concept aliases.
     */
    List<MedicationOrderDto> getMedicationOrders(String patientId, List<String> conceptAliases, LocalDate windowStart, LocalDate windowEnd);

    /**
     * Get diagnoses for a patient filtered by model type.
     */
    List<DiagnosisDto> getDiagnoses(String patientId, String modelType);

    /**
     * Get suppression status for a patient's target HCC and model type.
     */
    Optional<HccSuppressionStatusDto> getSuppressionStatus(String patientId, String targetHcc, String modelType);

    /**
     * Get rejection state for resurfacing logic.
     */
    Optional<HccRuleRejectionState> getRejectionState(String patientId, Long ruleId, String modelType);

    /**
     * Get all patient IDs in the dataset (for batch evaluation).
     */
    List<String> getAllPatientIds();
}
