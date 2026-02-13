package com.algoaccel.service;

import com.algoaccel.dto.request.ImportRequest;
import com.algoaccel.dto.response.ImportResultDto;
import com.algoaccel.model.component.AtomicComponent;
import com.algoaccel.model.component.LibraryComponent;
import com.algoaccel.model.enums.*;
import com.algoaccel.model.measure.*;
import com.algoaccel.model.validation.TestPatient;
import com.algoaccel.repository.ComponentRepository;
import com.algoaccel.repository.MeasureRepository;
import com.algoaccel.repository.TestPatientRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Service for importing data from Zustand/frontend export format.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportService {

    private final MeasureRepository measureRepository;
    private final ComponentRepository componentRepository;
    private final TestPatientRepository testPatientRepository;
    private final ObjectMapper objectMapper;

    /**
     * Import data from Zustand export format.
     */
    @Transactional
    public ImportResultDto importData(ImportRequest request) {
        int componentsImported = 0;
        int measuresImported = 0;
        int validationTracesImported = 0;

        try {
            // Import components
            if (request.components() != null) {
                for (Map<String, Object> componentData : request.components()) {
                    try {
                        importComponent(componentData);
                        componentsImported++;
                    } catch (Exception e) {
                        log.warn("Failed to import component: {}", e.getMessage());
                    }
                }
            }

            // Import measures
            if (request.measures() != null) {
                for (Map<String, Object> measureData : request.measures()) {
                    try {
                        importMeasure(measureData);
                        measuresImported++;
                    } catch (Exception e) {
                        log.warn("Failed to import measure: {}", e.getMessage());
                    }
                }
            }

            // Import validation traces (test patients)
            if (request.validationTraces() != null) {
                for (Map<String, Object> traceData : request.validationTraces()) {
                    try {
                        importValidationTrace(traceData);
                        validationTracesImported++;
                    } catch (Exception e) {
                        log.warn("Failed to import validation trace: {}", e.getMessage());
                    }
                }
            }

            log.info("Import completed: {} components, {} measures, {} validation traces",
                componentsImported, measuresImported, validationTracesImported);

            return new ImportResultDto(
                componentsImported,
                measuresImported,
                validationTracesImported,
                true,
                "Import completed successfully"
            );

        } catch (Exception e) {
            log.error("Import failed: {}", e.getMessage(), e);
            return new ImportResultDto(
                componentsImported,
                measuresImported,
                validationTracesImported,
                false,
                "Import failed: " + e.getMessage()
            );
        }
    }

    /**
     * Import a single component.
     * Creates an AtomicComponent for simplicity.
     */
    private void importComponent(Map<String, Object> data) {
        String id = (String) data.get("id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }

        // Check if exists
        if (componentRepository.existsById(id)) {
            log.debug("Component {} already exists, skipping", id);
            return;
        }

        // Create an AtomicComponent (most common type)
        AtomicComponent component = new AtomicComponent();
        component.setId(id);
        component.setName((String) data.get("name"));
        component.setDescription((String) data.get("description"));

        componentRepository.save(component);
    }

    /**
     * Import a single measure.
     */
    private void importMeasure(Map<String, Object> data) {
        String id = (String) data.get("id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }

        // Check if exists
        if (measureRepository.existsById(id)) {
            log.debug("Measure {} already exists, updating", id);
        }

        Measure measure = measureRepository.findById(id).orElse(new Measure());
        measure.setId(id);
        measure.setMeasureId((String) data.get("measureId"));
        measure.setTitle((String) data.get("title"));
        measure.setVersion((String) data.get("version"));
        measure.setSteward((String) data.get("steward"));
        measure.setDescription((String) data.get("description"));
        measure.setRationale((String) data.get("rationale"));
        measure.setClinicalRecommendation((String) data.get("clinicalRecommendation"));
        measure.setPeriodStart((String) data.get("periodStart"));
        measure.setPeriodEnd((String) data.get("periodEnd"));
        measure.setMeasureType((String) data.get("measureType"));
        measure.setGeneratedCql((String) data.get("generatedCql"));
        measure.setGeneratedSql((String) data.get("generatedSql"));

        String program = (String) data.get("program");
        if (program != null) {
            try {
                measure.setProgram(MeasureProgram.valueOf(program.toUpperCase().replace(" ", "_")));
            } catch (IllegalArgumentException e) {
                // Skip invalid program
            }
        }

        String status = (String) data.get("status");
        if (status != null) {
            try {
                measure.setStatus(MeasureStatus.valueOf(status.toUpperCase()));
            } catch (IllegalArgumentException e) {
                measure.setStatus(MeasureStatus.IN_PROGRESS);
            }
        }

        // Import global constraints
        Map<String, Object> globalConstraints = (Map<String, Object>) data.get("globalConstraints");
        if (globalConstraints != null) {
            GlobalConstraints gc = new GlobalConstraints();
            if (globalConstraints.get("ageMin") != null) {
                gc.setAgeMin(((Number) globalConstraints.get("ageMin")).intValue());
            }
            if (globalConstraints.get("ageMax") != null) {
                gc.setAgeMax(((Number) globalConstraints.get("ageMax")).intValue());
            }
            String gender = (String) globalConstraints.get("gender");
            if (gender != null) {
                try {
                    gc.setGender(Gender.valueOf(gender.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    // Skip invalid gender
                }
            }
            gc.setAgeCalculation((String) globalConstraints.get("ageCalculation"));
            measure.setGlobalConstraints(gc);
        }

        // Import populations
        List<Map<String, Object>> populations = (List<Map<String, Object>>) data.get("populations");
        if (populations != null) {
            int order = 0;
            for (Map<String, Object> popData : populations) {
                Population population = importPopulation(popData, measure, order++);
                if (population != null) {
                    measure.addPopulation(population);
                }
            }
        }

        measureRepository.save(measure);
    }

    /**
     * Import a population.
     */
    private Population importPopulation(Map<String, Object> data, Measure measure, int order) {
        String id = (String) data.get("id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }

        Population population = Population.builder()
            .id(id)
            .description((String) data.get("description"))
            .narrative((String) data.get("narrative"))
            .displayOrder(order)
            .cqlDefinition((String) data.get("cqlDefinition"))
            .cqlDefinitionName((String) data.get("cqlDefinitionName"))
            .build();

        String type = (String) data.get("type");
        if (type == null) {
            type = (String) data.get("populationType");
        }
        if (type != null) {
            try {
                population.setPopulationType(PopulationType.valueOf(type.toUpperCase().replace(" ", "_")));
            } catch (IllegalArgumentException e) {
                population.setPopulationType(PopulationType.INITIAL_POPULATION);
            }
        }

        // Import root clause
        Map<String, Object> clauseData = (Map<String, Object>) data.get("rootClause");
        if (clauseData == null) {
            clauseData = (Map<String, Object>) data.get("clause");
        }
        if (clauseData != null) {
            LogicalClause rootClause = importClause(clauseData, null, 0);
            population.setRootClause(rootClause);
        }

        return population;
    }

    /**
     * Import a logical clause recursively.
     */
    private LogicalClause importClause(Map<String, Object> data, LogicalClause parent, int order) {
        String id = (String) data.get("id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }

        LogicalClause clause = LogicalClause.builder()
            .id(id)
            .description((String) data.get("description"))
            .displayOrder(order)
            .cqlSnippet((String) data.get("cqlSnippet"))
            .cqlDefinitionName((String) data.get("cqlDefinitionName"))
            .parentClause(parent)
            .build();

        String operator = (String) data.get("operator");
        if (operator != null) {
            try {
                clause.setOperator(LogicalOperator.valueOf(operator.toUpperCase()));
            } catch (IllegalArgumentException e) {
                clause.setOperator(LogicalOperator.AND);
            }
        } else {
            clause.setOperator(LogicalOperator.AND);
        }

        // Import child clauses
        List<Map<String, Object>> children = (List<Map<String, Object>>) data.get("children");
        if (children == null) {
            children = (List<Map<String, Object>>) data.get("childClauses");
        }
        if (children != null) {
            int childOrder = 0;
            for (Map<String, Object> childData : children) {
                LogicalClause child = importClause(childData, clause, childOrder++);
                clause.addChildClause(child);
            }
        }

        // Import data elements
        List<Map<String, Object>> elements = (List<Map<String, Object>>) data.get("dataElements");
        if (elements == null) {
            elements = (List<Map<String, Object>>) data.get("elements");
        }
        if (elements != null) {
            int elemOrder = 0;
            for (Map<String, Object> elemData : elements) {
                DataElement element = importDataElement(elemData, clause, elemOrder++);
                clause.addDataElement(element);
            }
        }

        return clause;
    }

    /**
     * Import a data element.
     */
    private DataElement importDataElement(Map<String, Object> data, LogicalClause clause, int order) {
        String id = (String) data.get("id");
        if (id == null) {
            id = UUID.randomUUID().toString();
        }

        DataElement element = DataElement.builder()
            .id(id)
            .description((String) data.get("description"))
            .resourceType((String) data.get("resourceType"))
            .displayOrder(order)
            .negation(Boolean.TRUE.equals(data.get("negation")))
            .negationRationale((String) data.get("negationRationale"))
            .cqlDefinitionName((String) data.get("cqlDefinitionName"))
            .cqlExpression((String) data.get("cqlExpression"))
            .clause(clause)
            .build();

        String type = (String) data.get("type");
        if (type == null) {
            type = (String) data.get("elementType");
        }
        if (type != null) {
            try {
                element.setElementType(DataElementType.valueOf(type.toUpperCase()));
            } catch (IllegalArgumentException e) {
                element.setElementType(DataElementType.ASSESSMENT);
            }
        }

        String gender = (String) data.get("genderValue");
        if (gender != null) {
            try {
                element.setGenderValue(Gender.valueOf(gender.toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Skip invalid gender
            }
        }

        // Import thresholds
        Map<String, Object> thresholds = (Map<String, Object>) data.get("thresholds");
        if (thresholds != null) {
            ThresholdRange tr = new ThresholdRange();
            if (thresholds.get("ageMin") != null) {
                tr.setAgeMin(((Number) thresholds.get("ageMin")).intValue());
            }
            if (thresholds.get("ageMax") != null) {
                tr.setAgeMax(((Number) thresholds.get("ageMax")).intValue());
            }
            if (thresholds.get("valueMin") != null) {
                tr.setValueMin(java.math.BigDecimal.valueOf(((Number) thresholds.get("valueMin")).doubleValue()));
            }
            if (thresholds.get("valueMax") != null) {
                tr.setValueMax(java.math.BigDecimal.valueOf(((Number) thresholds.get("valueMax")).doubleValue()));
            }
            tr.setComparator((String) thresholds.get("comparator"));
            tr.setUnit((String) thresholds.get("unit"));
            element.setThresholds(tr);
        }

        return element;
    }

    /**
     * Import a validation trace (test patient data).
     */
    private void importValidationTrace(Map<String, Object> data) {
        String patientId = (String) data.get("patientId");
        if (patientId == null) {
            patientId = UUID.randomUUID().toString();
        }

        // Check if patient exists
        if (testPatientRepository.existsById(patientId)) {
            log.debug("Test patient {} already exists, skipping", patientId);
            return;
        }

        // Extract patient data from trace
        Map<String, Object> patientData = (Map<String, Object>) data.get("patient");
        if (patientData == null) {
            patientData = data;
        }

        TestPatient patient = new TestPatient();
        patient.setId(patientId);
        patient.setName((String) patientData.getOrDefault("patientName", (String) patientData.get("name")));
        patient.setGender((String) patientData.getOrDefault("patientGender", (String) patientData.get("gender")));

        String birthDate = (String) patientData.get("birthDate");
        if (birthDate != null) {
            try {
                patient.setBirthDate(LocalDate.parse(birthDate));
            } catch (Exception e) {
                log.warn("Failed to parse birth date: {}", birthDate);
            }
        }

        patient.setRace((String) patientData.get("race"));
        patient.setEthnicity((String) patientData.get("ethnicity"));

        // Store clinical data as JSON
        try {
            if (patientData.get("diagnoses") != null) {
                patient.setDiagnoses(objectMapper.writeValueAsString(patientData.get("diagnoses")));
            }
            if (patientData.get("encounters") != null) {
                patient.setEncounters(objectMapper.writeValueAsString(patientData.get("encounters")));
            }
            if (patientData.get("procedures") != null) {
                patient.setProcedures(objectMapper.writeValueAsString(patientData.get("procedures")));
            }
            if (patientData.get("observations") != null) {
                patient.setObservations(objectMapper.writeValueAsString(patientData.get("observations")));
            }
            if (patientData.get("medications") != null) {
                patient.setMedications(objectMapper.writeValueAsString(patientData.get("medications")));
            }
            if (patientData.get("immunizations") != null) {
                patient.setImmunizations(objectMapper.writeValueAsString(patientData.get("immunizations")));
            }
        } catch (Exception e) {
            log.warn("Failed to serialize patient clinical data: {}", e.getMessage());
        }

        testPatientRepository.save(patient);
    }

    /**
     * Export all data to Zustand format.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportData() {
        Map<String, Object> export = new HashMap<>();

        // Export components
        List<Map<String, Object>> components = new ArrayList<>();
        componentRepository.findAll().forEach(component -> {
            Map<String, Object> data = new HashMap<>();
            data.put("id", component.getId());
            data.put("name", component.getName());
            data.put("type", component.getType());
            data.put("description", component.getDescription());
            components.add(data);
        });
        export.put("components", components);

        // Export measures
        List<Map<String, Object>> measures = new ArrayList<>();
        measureRepository.findAll().forEach(measure -> {
            Map<String, Object> data = new HashMap<>();
            data.put("id", measure.getId());
            data.put("measureId", measure.getMeasureId());
            data.put("title", measure.getTitle());
            data.put("version", measure.getVersion());
            data.put("steward", measure.getSteward());
            data.put("program", measure.getProgram() != null ? measure.getProgram().name() : null);
            data.put("status", measure.getStatus() != null ? measure.getStatus().name() : null);
            data.put("description", measure.getDescription());
            data.put("generatedCql", measure.getGeneratedCql());
            data.put("generatedSql", measure.getGeneratedSql());
            measures.add(data);
        });
        export.put("measures", measures);

        export.put("version", 1);
        export.put("exportedAt", java.time.Instant.now().toString());

        return export;
    }
}
