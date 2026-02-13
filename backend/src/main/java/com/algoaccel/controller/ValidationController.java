package com.algoaccel.controller;

import com.algoaccel.dto.mapper.MeasureMapper;
import com.algoaccel.dto.response.ValidationTraceDto;
import com.algoaccel.model.measure.Measure;
import com.algoaccel.model.validation.TestPatient;
import com.algoaccel.repository.MeasureRepository;
import com.algoaccel.repository.TestPatientRepository;
import com.algoaccel.service.MeasureEvaluatorService;
import com.algoaccel.service.TestPatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller for test patient validation operations.
 */
@RestController
@RequestMapping("/api/validation")
@RequiredArgsConstructor
@Slf4j
public class ValidationController {

    private final TestPatientService testPatientService;
    private final TestPatientRepository testPatientRepository;
    private final MeasureEvaluatorService measureEvaluatorService;
    private final MeasureRepository measureRepository;
    private final MeasureMapper measureMapper;

    /**
     * Get all test patients.
     */
    @GetMapping("/patients")
    public ResponseEntity<List<TestPatientDto>> getAllTestPatients() {
        List<TestPatient> patients = testPatientService.getAllTestPatients();
        return ResponseEntity.ok(patients.stream()
            .map(this::toTestPatientDto)
            .collect(Collectors.toList()));
    }

    /**
     * Get test patients filtered for a specific measure.
     */
    @GetMapping("/patients/for-measure/{measureId}")
    public ResponseEntity<List<TestPatientDto>> getTestPatientsForMeasure(@PathVariable String measureId) {
        return measureRepository.findById(measureId)
            .map(measure -> {
                List<TestPatient> patients = testPatientService.getTestPatientsForMeasure(measure);
                return ResponseEntity.ok(patients.stream()
                    .map(this::toTestPatientDto)
                    .collect(Collectors.toList()));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get a specific test patient.
     */
    @GetMapping("/patients/{id}")
    public ResponseEntity<TestPatientDetailDto> getTestPatient(@PathVariable String id) {
        return testPatientRepository.findById(id)
            .map(patient -> ResponseEntity.ok(toTestPatientDetailDto(patient)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Evaluate a single patient against a measure.
     */
    @GetMapping("/evaluate/{measureId}/{patientId}")
    public ResponseEntity<ValidationTraceDto> evaluatePatient(
            @PathVariable String measureId,
            @PathVariable String patientId) {

        var measureOpt = measureRepository.findById(measureId);
        var patientOpt = testPatientRepository.findById(patientId);

        if (measureOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (patientOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        MeasureEvaluatorService.ValidationTrace trace =
            measureEvaluatorService.evaluatePatient(patientOpt.get(), measureOpt.get());

        return ResponseEntity.ok(measureMapper.toValidationTraceDto(trace));
    }

    /**
     * Evaluate all test patients against a measure.
     */
    @GetMapping("/evaluate/{measureId}")
    public ResponseEntity<ValidationResultsDto> evaluateAllPatients(@PathVariable String measureId) {
        return measureRepository.findById(measureId)
            .map(measure -> {
                List<TestPatient> patients = testPatientService.getTestPatientsForMeasure(measure);

                List<ValidationTraceDto> traces = patients.stream()
                    .map(patient -> measureEvaluatorService.evaluatePatient(patient, measure))
                    .map(trace -> measureMapper.toValidationTraceDto(trace))
                    .collect(Collectors.toList());

                // Calculate summary statistics
                long total = traces.size();
                long inPopulation = traces.stream()
                    .filter(t -> !"not_in_population".equals(t.finalOutcome()))
                    .count();
                long inNumerator = traces.stream()
                    .filter(t -> "in_numerator".equals(t.finalOutcome()))
                    .count();
                long excluded = traces.stream()
                    .filter(t -> "excluded".equals(t.finalOutcome()))
                    .count();
                long notInNumerator = traces.stream()
                    .filter(t -> "not_in_numerator".equals(t.finalOutcome()))
                    .count();

                double performanceRate = inPopulation > 0 ? (double) inNumerator / inPopulation * 100 : 0;

                ValidationSummaryDto summary = new ValidationSummaryDto(
                    total,
                    inPopulation,
                    inNumerator,
                    excluded,
                    notInNumerator,
                    performanceRate
                );

                return ResponseEntity.ok(new ValidationResultsDto(
                    measureId,
                    measure.getTitle(),
                    summary,
                    traces
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get patient counts by outcome for a measure.
     */
    @GetMapping("/summary/{measureId}")
    public ResponseEntity<ValidationSummaryDto> getValidationSummary(@PathVariable String measureId) {
        return measureRepository.findById(measureId)
            .map(measure -> {
                List<TestPatient> patients = testPatientService.getTestPatientsForMeasure(measure);

                long total = patients.size();
                long inPopulation = 0;
                long inNumerator = 0;
                long excluded = 0;
                long notInNumerator = 0;

                for (TestPatient patient : patients) {
                    MeasureEvaluatorService.ValidationTrace trace =
                        measureEvaluatorService.evaluatePatient(patient, measure);

                    switch (trace.getFinalOutcome()) {
                        case "in_numerator":
                            inNumerator++;
                            inPopulation++;
                            break;
                        case "not_in_numerator":
                            notInNumerator++;
                            inPopulation++;
                            break;
                        case "excluded":
                            excluded++;
                            inPopulation++;
                            break;
                        default:
                            break;
                    }
                }

                double performanceRate = inPopulation > 0 ? (double) inNumerator / inPopulation * 100 : 0;

                return ResponseEntity.ok(new ValidationSummaryDto(
                    total,
                    inPopulation,
                    inNumerator,
                    excluded,
                    notInNumerator,
                    performanceRate
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // DTO classes

    private TestPatientDto toTestPatientDto(TestPatient patient) {
        return new TestPatientDto(
            patient.getId(),
            patient.getName(),
            patient.getBirthDate() != null ? patient.getBirthDate().toString() : null,
            patient.getGender(),
            patient.getRace(),
            patient.getEthnicity()
        );
    }

    private TestPatientDetailDto toTestPatientDetailDto(TestPatient patient) {
        return new TestPatientDetailDto(
            patient.getId(),
            patient.getName(),
            patient.getBirthDate() != null ? patient.getBirthDate().toString() : null,
            patient.getGender(),
            patient.getRace(),
            patient.getEthnicity(),
            patient.getDiagnoses(),
            patient.getEncounters(),
            patient.getProcedures(),
            patient.getObservations(),
            patient.getMedications(),
            patient.getImmunizations()
        );
    }

    public record TestPatientDto(
        String id,
        String name,
        String birthDate,
        String gender,
        String race,
        String ethnicity
    ) {}

    public record TestPatientDetailDto(
        String id,
        String name,
        String birthDate,
        String gender,
        String race,
        String ethnicity,
        String diagnoses,
        String encounters,
        String procedures,
        String observations,
        String medications,
        String immunizations
    ) {}

    public record ValidationSummaryDto(
        long totalPatients,
        long inPopulation,
        long inNumerator,
        long excluded,
        long notInNumerator,
        double performanceRate
    ) {}

    public record ValidationResultsDto(
        String measureId,
        String measureTitle,
        ValidationSummaryDto summary,
        List<ValidationTraceDto> traces
    ) {}
}
