package com.algoaccel.service;

import com.algoaccel.model.measure.DataElement;
import com.algoaccel.model.measure.LogicalClause;
import com.algoaccel.model.measure.Measure;
import com.algoaccel.model.measure.Population;
import com.algoaccel.model.enums.Gender;
import com.algoaccel.model.validation.TestPatient;
import com.algoaccel.repository.TestPatientRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Service for test patient generation and management.
 * Provides sex-aware test patient generation for measure validation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TestPatientService {

    private final TestPatientRepository testPatientRepository;
    private final ObjectMapper objectMapper;

    /**
     * Get all test patients from the database.
     */
    public List<TestPatient> getAllTestPatients() {
        return testPatientRepository.findAll();
    }

    /**
     * Get test patients filtered for a specific measure.
     * Returns patients that match the measure's gender requirements if applicable.
     */
    public List<TestPatient> getTestPatientsForMeasure(Measure measure) {
        List<TestPatient> allPatients = testPatientRepository.findAll();

        // Check if measure has gender requirement
        Gender requiredGender = detectRequiredGender(measure);

        if (requiredGender == null) {
            return allPatients;
        }

        // Filter to matching gender, but include some opposite-sex as expected-fail cases
        List<TestPatient> matchingPatients = new ArrayList<>();
        List<TestPatient> oppositePatients = new ArrayList<>();

        for (TestPatient patient : allPatients) {
            if (matchesGender(patient.getGender(), requiredGender)) {
                matchingPatients.add(patient);
            } else {
                oppositePatients.add(patient);
            }
        }

        // Include up to 3 opposite-sex patients as expected-fail cases
        int oppositeToInclude = Math.min(3, oppositePatients.size());
        matchingPatients.addAll(oppositePatients.subList(0, oppositeToInclude));

        return matchingPatients;
    }

    /**
     * Detect if a measure requires a specific gender.
     */
    public Gender detectRequiredGender(Measure measure) {
        // Check global constraints
        if (measure.getGlobalConstraints() != null &&
            measure.getGlobalConstraints().getGender() != null) {
            return measure.getGlobalConstraints().getGender();
        }

        // Check title/description for gender-specific keywords
        String title = measure.getTitle() != null ? measure.getTitle().toLowerCase() : "";
        String description = measure.getDescription() != null ? measure.getDescription().toLowerCase() : "";
        String measureId = measure.getMeasureId() != null ? measure.getMeasureId().toUpperCase() : "";

        // Female-specific measures
        if (isCervicalCancerMeasure(title, measureId) ||
            isBreastCancerMeasure(title, measureId) ||
            title.contains("prenatal") ||
            title.contains("maternal") ||
            title.contains("pregnancy") ||
            description.contains("women only") ||
            description.contains("female only")) {
            return Gender.FEMALE;
        }

        // Male-specific measures
        if (title.contains("prostate") ||
            measureId.contains("PSA") ||
            description.contains("men only") ||
            description.contains("male only")) {
            return Gender.MALE;
        }

        // Scan population criteria for gender data elements
        return scanPopulationsForGender(measure);
    }

    /**
     * Scan population criteria for gender-specific data elements.
     */
    private Gender scanPopulationsForGender(Measure measure) {
        for (Population population : measure.getPopulations()) {
            LogicalClause rootClause = population.getRootClause();
            if (rootClause != null) {
                Gender found = scanClauseForGender(rootClause);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Recursively scan a clause tree for gender data elements.
     */
    private Gender scanClauseForGender(LogicalClause clause) {
        // Check data elements
        for (DataElement element : clause.getDataElements()) {
            if (element.getGenderValue() != null) {
                return element.getGenderValue();
            }
        }

        // Recurse into child clauses
        for (LogicalClause child : clause.getChildClauses()) {
            Gender found = scanClauseForGender(child);
            if (found != null) {
                return found;
            }
        }

        return null;
    }

    /**
     * Check if this is a cervical cancer screening measure.
     */
    private boolean isCervicalCancerMeasure(String title, String measureId) {
        return title.contains("cervical") ||
               title.contains("cervix") ||
               title.contains("pap smear") ||
               title.contains("pap test") ||
               measureId.contains("CMS124") ||
               measureId.contains("CCS");
    }

    /**
     * Check if this is a breast cancer screening measure.
     */
    private boolean isBreastCancerMeasure(String title, String measureId) {
        return (title.contains("breast") && title.contains("screen")) ||
               title.contains("mammogra") ||
               measureId.contains("CMS125") ||
               measureId.contains("BCS");
    }

    /**
     * Check if patient gender matches required gender.
     */
    private boolean matchesGender(String patientGender, Gender requiredGender) {
        if (patientGender == null || requiredGender == null) {
            return true;
        }
        String normalized = patientGender.toLowerCase();
        return (requiredGender == Gender.FEMALE && normalized.equals("female")) ||
               (requiredGender == Gender.MALE && normalized.equals("male"));
    }

    /**
     * Generate test patients for a measure with appropriate demographics.
     * Creates numerator-positive patients with matching sex when measure includes sex criteria.
     */
    public List<TestPatient> generateTestPatientsForMeasure(Measure measure, int count) {
        Gender requiredGender = detectRequiredGender(measure);
        List<TestPatient> patients = new ArrayList<>();

        int numPositive = (int) Math.ceil(count * 0.7); // 70% expected positive
        int numNegative = count - numPositive;

        // Generate numerator-positive patients with matching sex
        for (int i = 0; i < numPositive; i++) {
            patients.add(createTestPatient(
                "test-pos-" + (i + 1),
                "Numerator Positive " + (i + 1),
                requiredGender != null ? requiredGender.name().toLowerCase() : (i % 2 == 0 ? "female" : "male"),
                true,
                measure
            ));
        }

        // Generate expected-fail patients (some with opposite sex)
        for (int i = 0; i < numNegative; i++) {
            String gender;
            if (requiredGender != null && i == 0) {
                // First negative is opposite sex
                gender = requiredGender == Gender.FEMALE ? "male" : "female";
            } else {
                gender = requiredGender != null ? requiredGender.name().toLowerCase() : (i % 2 == 0 ? "male" : "female");
            }
            patients.add(createTestPatient(
                "test-neg-" + (i + 1),
                "Expected Fail " + (i + 1),
                gender,
                false,
                measure
            ));
        }

        return patients;
    }

    /**
     * Create a test patient with specified characteristics.
     */
    private TestPatient createTestPatient(String id, String name, String gender, boolean numeratorPositive, Measure measure) {
        TestPatient patient = new TestPatient();
        patient.setId(id);
        patient.setName(name);
        patient.setGender(gender);

        // Set appropriate birth date based on measure age requirements
        patient.setBirthDate(calculateBirthDateForMeasure(measure, numeratorPositive));

        // Set race and ethnicity
        patient.setRace("White");
        patient.setEthnicity("Not Hispanic or Latino");

        // Initialize empty JSON arrays for clinical data
        patient.setDiagnoses("[]");
        patient.setEncounters("[]");
        patient.setProcedures("[]");
        patient.setObservations("[]");
        patient.setMedications("[]");
        patient.setImmunizations("[]");

        return patient;
    }

    /**
     * Calculate an appropriate birth date based on measure age requirements.
     */
    private LocalDate calculateBirthDateForMeasure(Measure measure, boolean withinRange) {
        int targetAge = 50; // Default middle-aged

        // Check global constraints for age range
        if (measure.getGlobalConstraints() != null) {
            Integer minAge = measure.getGlobalConstraints().getAgeMin();
            Integer maxAge = measure.getGlobalConstraints().getAgeMax();

            if (minAge != null && maxAge != null) {
                targetAge = withinRange ? (minAge + maxAge) / 2 : maxAge + 5;
            } else if (minAge != null) {
                targetAge = withinRange ? minAge + 10 : minAge - 5;
            } else if (maxAge != null) {
                targetAge = withinRange ? maxAge - 10 : maxAge + 10;
            }
        }

        // Calculate birth date from target age
        return LocalDate.now().minusYears(targetAge);
    }

    /**
     * Parse diagnoses JSON to a list of maps.
     */
    public List<Map<String, Object>> parseDiagnoses(TestPatient patient) {
        return parseJsonArray(patient.getDiagnoses());
    }

    /**
     * Parse encounters JSON to a list of maps.
     */
    public List<Map<String, Object>> parseEncounters(TestPatient patient) {
        return parseJsonArray(patient.getEncounters());
    }

    /**
     * Parse procedures JSON to a list of maps.
     */
    public List<Map<String, Object>> parseProcedures(TestPatient patient) {
        return parseJsonArray(patient.getProcedures());
    }

    /**
     * Parse observations JSON to a list of maps.
     */
    public List<Map<String, Object>> parseObservations(TestPatient patient) {
        return parseJsonArray(patient.getObservations());
    }

    /**
     * Parse medications JSON to a list of maps.
     */
    public List<Map<String, Object>> parseMedications(TestPatient patient) {
        return parseJsonArray(patient.getMedications());
    }

    /**
     * Parse immunizations JSON to a list of maps.
     */
    public List<Map<String, Object>> parseImmunizations(TestPatient patient) {
        return parseJsonArray(patient.getImmunizations());
    }

    /**
     * Parse a JSON array string to a list of maps.
     */
    private List<Map<String, Object>> parseJsonArray(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse JSON array: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}
