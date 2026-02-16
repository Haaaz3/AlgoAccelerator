package com.algoaccel.controller;

import com.algoaccel.dto.request.CreateMeasureRequest;
import com.algoaccel.dto.request.UpdateMeasureRequest;
import com.algoaccel.dto.response.MeasureDto;
import com.algoaccel.dto.response.MeasureSummaryDto;
import com.algoaccel.dto.response.ValidationTraceDto;
import com.algoaccel.service.MeasureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for measure operations.
 */
@RestController
@RequestMapping("/api/measures")
@RequiredArgsConstructor
@Slf4j
public class MeasureController {

    private final MeasureService measureService;

    /**
     * Get all measures with optional filtering.
     */
    @GetMapping
    public ResponseEntity<List<MeasureSummaryDto>> getAllMeasures(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<MeasureSummaryDto> measures;
        if (search != null && !search.isBlank()) {
            measures = measureService.searchMeasures(search);
        } else if (status != null && !status.isBlank()) {
            measures = measureService.getMeasuresByStatus(status);
        } else {
            measures = measureService.getAllMeasures();
        }

        return ResponseEntity.ok(measures);
    }

    /**
     * Get all measures with full details in a single request.
     * This endpoint eliminates the N+1 query problem by fetching all measures
     * with their complete data in one database transaction.
     */
    @GetMapping("/full")
    public ResponseEntity<List<MeasureDto>> getAllMeasuresFull() {
        List<MeasureDto> measures = measureService.getAllMeasuresFull();
        return ResponseEntity.ok(measures);
    }

    /**
     * Get a measure by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MeasureDto> getMeasureById(@PathVariable String id) {
        return measureService.getMeasureById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get a measure by CMS measure ID.
     */
    @GetMapping("/by-measure-id/{measureId}")
    public ResponseEntity<MeasureDto> getMeasureByMeasureId(@PathVariable String measureId) {
        return measureService.getMeasureByMeasureId(measureId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new measure.
     */
    @PostMapping
    public ResponseEntity<MeasureDto> createMeasure(@Valid @RequestBody CreateMeasureRequest request) {
        MeasureDto created = measureService.createMeasure(request);
        return ResponseEntity.ok(created);
    }

    /**
     * Update an existing measure.
     */
    @PutMapping("/{id}")
    public ResponseEntity<MeasureDto> updateMeasure(
            @PathVariable String id,
            @Valid @RequestBody UpdateMeasureRequest request) {
        return measureService.updateMeasure(id, request)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete a measure.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMeasure(@PathVariable String id) {
        if (measureService.deleteMeasure(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Lock a measure.
     */
    @PostMapping("/{id}/lock")
    public ResponseEntity<MeasureDto> lockMeasure(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String lockedBy = body.getOrDefault("lockedBy", "system");
        return measureService.lockMeasure(id, lockedBy)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Unlock a measure.
     */
    @PostMapping("/{id}/unlock")
    public ResponseEntity<MeasureDto> unlockMeasure(@PathVariable String id) {
        return measureService.unlockMeasure(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Validate a measure against test patients.
     */
    @GetMapping("/{id}/validate")
    public ResponseEntity<List<ValidationTraceDto>> validateMeasure(@PathVariable String id) {
        List<ValidationTraceDto> traces = measureService.validateMeasure(id);
        if (traces.isEmpty()) {
            return measureService.getMeasureById(id).isPresent()
                ? ResponseEntity.ok(traces)
                : ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(traces);
    }

    /**
     * Get validation summary for a measure.
     */
    @GetMapping("/{id}/validate/summary")
    public ResponseEntity<MeasureService.ValidationSummary> getValidationSummary(@PathVariable String id) {
        return measureService.getMeasureById(id)
            .map(m -> ResponseEntity.ok(measureService.getValidationSummary(id)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Generate CQL for a measure.
     */
    @GetMapping("/{id}/cql")
    public ResponseEntity<Map<String, String>> generateCql(@PathVariable String id) {
        return measureService.generateCql(id)
            .map(cql -> ResponseEntity.ok(Map.of("cql", cql)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Generate SQL for a measure.
     */
    @GetMapping("/{id}/sql")
    public ResponseEntity<Map<String, String>> generateSql(@PathVariable String id) {
        return measureService.generateSql(id)
            .map(sql -> ResponseEntity.ok(Map.of("sql", sql)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Generate both CQL and SQL for a measure.
     */
    @GetMapping("/{id}/code")
    public ResponseEntity<Map<String, String>> generateCode(@PathVariable String id) {
        var cqlOpt = measureService.generateCql(id);
        var sqlOpt = measureService.generateSql(id);

        if (cqlOpt.isEmpty() && sqlOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
            "cql", cqlOpt.orElse(""),
            "sql", sqlOpt.orElse("")
        ));
    }
}
