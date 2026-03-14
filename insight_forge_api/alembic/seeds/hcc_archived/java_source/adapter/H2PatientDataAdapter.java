package com.algoaccel.hcc.adapter;

import com.algoaccel.hcc.dto.DiagnosisDto;
import com.algoaccel.hcc.dto.HccSuppressionStatusDto;
import com.algoaccel.hcc.dto.LabResultDto;
import com.algoaccel.hcc.dto.MedicationOrderDto;
import com.algoaccel.hcc.model.HccDiagnosis;
import com.algoaccel.hcc.model.HccLabResult;
import com.algoaccel.hcc.model.HccMedicationOrder;
import com.algoaccel.hcc.model.HccRuleRejectionState;
import com.algoaccel.hcc.model.enums.HccModelType;
import com.algoaccel.hcc.port.PatientDataPort;
import com.algoaccel.hcc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * H2/JPA implementation of PatientDataPort.
 * Queries synthetic patient data stored in H2 database.
 * This will be swapped for an Oracle HDI adapter in production.
 */
@Component
@RequiredArgsConstructor
public class H2PatientDataAdapter implements PatientDataPort {

    private final HccPatientRepository patientRepository;
    private final HccLabResultRepository labResultRepository;
    private final HccMedicationOrderRepository medicationOrderRepository;
    private final HccDiagnosisRepository diagnosisRepository;
    private final HccRuleRejectionStateRepository rejectionStateRepository;

    @Override
    public List<LabResultDto> getLabResults(String patientId, String conceptAlias, LocalDate windowStart, LocalDate windowEnd) {
        List<HccLabResult> results = labResultRepository.findByPatientIdAndConceptAliasAndResultDateBetween(
                patientId, conceptAlias, windowStart, windowEnd);

        return results.stream()
                .map(r -> LabResultDto.builder()
                        .patientId(r.getPatientId())
                        .conceptAlias(r.getConceptAlias())
                        .resultDate(r.getResultDate())
                        .qualitativeResult(r.getQualitativeResult())
                        .quantitativeResult(r.getQuantitativeResult())
                        .build())
                .toList();
    }

    @Override
    public List<MedicationOrderDto> getMedicationOrders(String patientId, List<String> conceptAliases, LocalDate windowStart, LocalDate windowEnd) {
        List<HccMedicationOrder> orders = medicationOrderRepository.findByPatientIdAndConceptAliasInAndStartDateBetween(
                patientId, conceptAliases, windowStart, windowEnd);

        return orders.stream()
                .map(o -> MedicationOrderDto.builder()
                        .patientId(o.getPatientId())
                        .conceptAlias(o.getConceptAlias())
                        .startDate(o.getStartDate())
                        .combinationType(o.getCombinationType())
                        .build())
                .toList();
    }

    @Override
    public List<DiagnosisDto> getDiagnoses(String patientId, String modelType) {
        HccModelType model = HccModelType.valueOf(modelType);
        List<HccDiagnosis> diagnoses = diagnosisRepository.findByPatientIdAndModelType(patientId, model);

        return diagnoses.stream()
                .map(d -> DiagnosisDto.builder()
                        .patientId(d.getPatientId())
                        .icdCode(d.getIcdCode())
                        .hccCategory(d.getHccCategory())
                        .modelType(d.getModelType().name())
                        .suppressionStatus(d.getSuppressionStatus())
                        .build())
                .toList();
    }

    @Override
    public Optional<HccSuppressionStatusDto> getSuppressionStatus(String patientId, String targetHcc, String modelType) {
        HccModelType model = HccModelType.valueOf(modelType);
        Optional<HccDiagnosis> diagnosis = diagnosisRepository.findByPatientIdAndHccCategoryAndModelType(
                patientId, targetHcc, model);

        return diagnosis.map(d -> HccSuppressionStatusDto.builder()
                .patientId(d.getPatientId())
                .targetHcc(d.getHccCategory())
                .modelType(d.getModelType().name())
                .status(d.getSuppressionStatus())
                .isSuppressed(isSuppressionStatus(d.getSuppressionStatus()))
                .build());
    }

    @Override
    public Optional<HccRuleRejectionState> getRejectionState(String patientId, Long ruleId, String modelType) {
        HccModelType model = HccModelType.valueOf(modelType);
        return rejectionStateRepository.findByPatientIdAndRuleIdAndModelType(patientId, ruleId, model);
    }

    @Override
    public List<String> getAllPatientIds() {
        return patientRepository.findAllPatientIds();
    }

    /**
     * Determines if a suppression status indicates the condition is suppressed.
     */
    private boolean isSuppressionStatus(String status) {
        if (status == null) {
            return false;
        }
        // Suppression states that indicate the HCC is validated
        return status.equals("Fully Validated") ||
               status.equals("Needs Administrative Attention") ||
               status.equals("Needs Clinical and Administrative Attention");
    }
}
