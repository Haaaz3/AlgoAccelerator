package com.algoaccel.service;

import com.algoaccel.dto.mapper.MeasureMapper;
import com.algoaccel.dto.request.CreateMeasureRequest;
import com.algoaccel.dto.request.UpdateMeasureRequest;
import com.algoaccel.dto.response.MeasureDto;
import com.algoaccel.dto.response.MeasureSummaryDto;
import com.algoaccel.dto.response.ValidationTraceDto;
import com.algoaccel.model.enums.MeasureStatus;
import com.algoaccel.model.measure.Measure;
import com.algoaccel.model.validation.TestPatient;
import com.algoaccel.repository.MeasureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for measure CRUD operations and validation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeasureService {

    private final MeasureRepository measureRepository;
    private final MeasureMapper measureMapper;
    private final TestPatientService testPatientService;
    private final MeasureEvaluatorService measureEvaluatorService;
    private final CqlGeneratorService cqlGeneratorService;
    private final HdiSqlGeneratorService hdiSqlGeneratorService;

    /**
     * Get all measures as summaries.
     */
    @Transactional(readOnly = true)
    public List<MeasureSummaryDto> getAllMeasures() {
        return measureRepository.findAll().stream()
            .map(measureMapper::toSummaryDto)
            .collect(Collectors.toList());
    }

    /**
     * Get all measures filtered by status.
     */
    @Transactional(readOnly = true)
    public List<MeasureSummaryDto> getMeasuresByStatus(String status) {
        try {
            MeasureStatus measureStatus = MeasureStatus.valueOf(status);
            return measureRepository.findByStatus(measureStatus).stream()
                .map(measureMapper::toSummaryDto)
                .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid status filter: {}", status);
            return getAllMeasures();
        }
    }

    /**
     * Get a measure by ID with full tree.
     */
    @Transactional(readOnly = true)
    public Optional<MeasureDto> getMeasureById(String id) {
        return measureRepository.findById(id)
            .map(measureMapper::toDto);
    }

    /**
     * Get a measure by CMS measure ID.
     */
    @Transactional(readOnly = true)
    public Optional<MeasureDto> getMeasureByMeasureId(String measureId) {
        return measureRepository.findByMeasureId(measureId)
            .map(measureMapper::toDto);
    }

    /**
     * Create a new measure.
     */
    @Transactional
    public MeasureDto createMeasure(CreateMeasureRequest request) {
        Measure measure = measureMapper.toEntity(request);
        Measure saved = measureRepository.save(measure);
        log.info("Created measure: {} ({})", saved.getTitle(), saved.getId());
        return measureMapper.toDto(saved);
    }

    /**
     * Update an existing measure.
     */
    @Transactional
    public Optional<MeasureDto> updateMeasure(String id, UpdateMeasureRequest request) {
        return measureRepository.findById(id)
            .map(measure -> {
                measureMapper.updateEntity(measure, request);
                Measure saved = measureRepository.save(measure);
                log.info("Updated measure: {} ({})", saved.getTitle(), saved.getId());
                return measureMapper.toDto(saved);
            });
    }

    /**
     * Delete a measure.
     */
    @Transactional
    public boolean deleteMeasure(String id) {
        if (measureRepository.existsById(id)) {
            measureRepository.deleteById(id);
            log.info("Deleted measure: {}", id);
            return true;
        }
        return false;
    }

    /**
     * Lock a measure to prevent editing.
     */
    @Transactional
    public Optional<MeasureDto> lockMeasure(String id, String lockedBy) {
        return measureRepository.findById(id)
            .map(measure -> {
                measure.setLockedAt(LocalDateTime.now());
                measure.setLockedBy(lockedBy);
                Measure saved = measureRepository.save(measure);
                log.info("Locked measure: {} by {}", id, lockedBy);
                return measureMapper.toDto(saved);
            });
    }

    /**
     * Unlock a measure.
     */
    @Transactional
    public Optional<MeasureDto> unlockMeasure(String id) {
        return measureRepository.findById(id)
            .map(measure -> {
                measure.setLockedAt(null);
                measure.setLockedBy(null);
                Measure saved = measureRepository.save(measure);
                log.info("Unlocked measure: {}", id);
                return measureMapper.toDto(saved);
            });
    }

    /**
     * Generate CQL for a measure.
     */
    @Transactional
    public Optional<String> generateCql(String id) {
        return measureRepository.findById(id)
            .map(measure -> {
                CqlGeneratorService.CqlGenerationResult result = cqlGeneratorService.generateCql(measure);
                String cql = result.cql();
                measure.setGeneratedCql(cql);
                measureRepository.save(measure);
                return cql;
            });
    }

    /**
     * Generate SQL for a measure.
     */
    @Transactional
    public Optional<String> generateSql(String id) {
        return measureRepository.findById(id)
            .map(measure -> {
                String sql = hdiSqlGeneratorService.generateSql(measure);
                measure.setGeneratedSql(sql);
                measureRepository.save(measure);
                return sql;
            });
    }

    /**
     * Validate a measure against test patients.
     */
    @Transactional(readOnly = true)
    public List<ValidationTraceDto> validateMeasure(String id) {
        return measureRepository.findById(id)
            .map(measure -> {
                List<TestPatient> patients = testPatientService.getTestPatientsForMeasure(measure);
                return patients.stream()
                    .map(patient -> measureEvaluatorService.evaluatePatient(patient, measure))
                    .map(trace -> measureMapper.toValidationTraceDto(trace))
                    .collect(Collectors.toList());
            })
            .orElse(List.of());
    }

    /**
     * Get validation summary statistics for a measure.
     */
    @Transactional(readOnly = true)
    public ValidationSummary getValidationSummary(String id) {
        List<ValidationTraceDto> traces = validateMeasure(id);

        long totalPatients = traces.size();
        long inPopulation = traces.stream()
            .filter(t -> !"not_in_population".equals(t.finalOutcome()))
            .count();
        long inNumerator = traces.stream()
            .filter(t -> "in_numerator".equals(t.finalOutcome()))
            .count();
        long excluded = traces.stream()
            .filter(t -> "excluded".equals(t.finalOutcome()))
            .count();

        return new ValidationSummary(
            totalPatients,
            inPopulation,
            inNumerator,
            excluded,
            inPopulation > 0 ? (double) inNumerator / inPopulation * 100 : 0
        );
    }

    /**
     * Search measures by title or description.
     */
    @Transactional(readOnly = true)
    public List<MeasureSummaryDto> searchMeasures(String query) {
        String searchTerm = "%" + query.toLowerCase() + "%";
        return measureRepository.findAll().stream()
            .filter(m ->
                (m.getTitle() != null && m.getTitle().toLowerCase().contains(query.toLowerCase())) ||
                (m.getDescription() != null && m.getDescription().toLowerCase().contains(query.toLowerCase())) ||
                (m.getMeasureId() != null && m.getMeasureId().toLowerCase().contains(query.toLowerCase()))
            )
            .map(measureMapper::toSummaryDto)
            .collect(Collectors.toList());
    }

    /**
     * Validation summary statistics.
     */
    public record ValidationSummary(
        long totalPatients,
        long inPopulation,
        long inNumerator,
        long excluded,
        double performanceRate
    ) {}
}
