package com.algoaccel.controller;

import com.algoaccel.dto.request.ImportRequest;
import com.algoaccel.dto.response.ImportResultDto;
import com.algoaccel.service.ImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for import/export operations.
 */
@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
@Slf4j
public class ImportController {

    private final ImportService importService;

    /**
     * Import data from Zustand export format.
     */
    @PostMapping
    public ResponseEntity<ImportResultDto> importData(@RequestBody ImportRequest request) {
        log.info("Importing data: {} measures, {} components",
            request.measures() != null ? request.measures().size() : 0,
            request.components() != null ? request.components().size() : 0);

        ImportResultDto result = importService.importData(request);

        if (result.success()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Export all data to Zustand format.
     */
    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> exportData() {
        Map<String, Object> export = importService.exportData();
        return ResponseEntity.ok(export);
    }
}
