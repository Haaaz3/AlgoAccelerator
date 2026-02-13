package com.algoaccel.service;

import com.algoaccel.model.enums.DataElementType;
import com.algoaccel.model.enums.Gender;
import com.algoaccel.model.enums.LogicalOperator;
import com.algoaccel.model.measure.*;
import com.algoaccel.model.validation.TestPatient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service for evaluating test patients against measure criteria.
 * Produces detailed validation traces showing pass/fail for each element.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeasureEvaluatorService {

    private final ObjectMapper objectMapper;

    /**
     * Evaluate a test patient against all populations of a measure.
     */
    public ValidationTrace evaluatePatient(TestPatient patient, Measure measure) {
        String mpStart = measure.getPeriodStart() != null ? measure.getPeriodStart() : LocalDate.now().getYear() + "-01-01";
        String mpEnd = measure.getPeriodEnd() != null ? measure.getPeriodEnd() : LocalDate.now().getYear() + "-12-31";

        ValidationTrace trace = new ValidationTrace();
        trace.setPatientId(patient.getId());
        trace.setPatientName(patient.getName());
        trace.setPatientGender(patient.getGender());

        List<PopulationResult> populationResults = new ArrayList<>();

        // Find populations by type
        Population ipPop = findPopulationByType(measure, "initial_population");
        Population denomPop = findPopulationByType(measure, "denominator");
        Population denomExclPop = findPopulationByType(measure, "denominator_exclusion");
        Population numerPop = findPopulationByType(measure, "numerator");

        // Pre-checks: gender
        EvaluationResult genderCheck = checkGenderRequirement(patient, measure);
        trace.getPreCheckResults().add(genderCheck);
        boolean preChecksPassed = genderCheck.isMet();

        // Pre-checks: age
        EvaluationResult ageCheck = checkAgeRequirement(patient, measure, mpStart, mpEnd);
        trace.getPreCheckResults().add(ageCheck);
        preChecksPassed = preChecksPassed && ageCheck.isMet();

        // Evaluate IP
        PopulationResult ipResult = new PopulationResult();
        ipResult.setPopulationType("initial_population");
        if (ipPop != null && preChecksPassed) {
            ClauseResult clauseResult = evaluateClause(patient, ipPop.getRootClause(), measure, mpStart, mpEnd);
            ipResult.setMet(clauseResult.isMet());
            ipResult.setNodes(clauseResult.getNodes());
        } else {
            ipResult.setMet(preChecksPassed);
        }
        populationResults.add(ipResult);

        // Evaluate Denominator
        PopulationResult denomResult = new PopulationResult();
        denomResult.setPopulationType("denominator");
        boolean denomEqualsIP = denomPop == null ||
            (denomPop.getDescription() != null && denomPop.getDescription().toLowerCase().contains("equals initial population")) ||
            (denomPop.getRootClause() != null && denomPop.getRootClause().getDataElements().isEmpty() && denomPop.getRootClause().getChildClauses().isEmpty());

        if (denomEqualsIP) {
            denomResult.setMet(ipResult.isMet());
        } else if (ipResult.isMet() && denomPop != null) {
            ClauseResult clauseResult = evaluateClause(patient, denomPop.getRootClause(), measure, mpStart, mpEnd);
            denomResult.setMet(clauseResult.isMet());
            denomResult.setNodes(clauseResult.getNodes());
        } else {
            denomResult.setMet(false);
        }
        populationResults.add(denomResult);

        // Evaluate Denominator Exclusion
        PopulationResult exclusionResult = new PopulationResult();
        exclusionResult.setPopulationType("denominator_exclusion");
        if (denomExclPop != null && denomResult.isMet()) {
            ClauseResult clauseResult = evaluateClause(patient, denomExclPop.getRootClause(), measure, mpStart, mpEnd);
            exclusionResult.setMet(clauseResult.isMet());
            exclusionResult.setNodes(clauseResult.getNodes());
        } else {
            exclusionResult.setMet(false);
        }
        populationResults.add(exclusionResult);

        // Evaluate Numerator
        PopulationResult numerResult = new PopulationResult();
        numerResult.setPopulationType("numerator");
        if (numerPop != null && denomResult.isMet() && !exclusionResult.isMet()) {
            ClauseResult clauseResult = evaluateClause(patient, numerPop.getRootClause(), measure, mpStart, mpEnd);
            numerResult.setMet(clauseResult.isMet());
            numerResult.setNodes(clauseResult.getNodes());
        } else {
            numerResult.setMet(false);
        }
        populationResults.add(numerResult);

        trace.setPopulationResults(populationResults);

        // Determine final outcome
        if (!ipResult.isMet()) {
            trace.setFinalOutcome("not_in_population");
        } else if (!denomResult.isMet()) {
            trace.setFinalOutcome("not_in_population");
        } else if (exclusionResult.isMet()) {
            trace.setFinalOutcome("excluded");
        } else if (numerResult.isMet()) {
            trace.setFinalOutcome("in_numerator");
        } else {
            trace.setFinalOutcome("not_in_numerator");
        }

        // Generate narrative
        trace.setNarrative(generateNarrative(patient, trace.getFinalOutcome(), measure));

        return trace;
    }

    /**
     * Evaluate a logical clause against patient data.
     */
    private ClauseResult evaluateClause(TestPatient patient, LogicalClause clause, Measure measure, String mpStart, String mpEnd) {
        ClauseResult result = new ClauseResult();
        result.setClauseId(clause.getId());
        result.setOperator(clause.getOperator());

        List<Boolean> childResults = new ArrayList<>();
        List<ValidationNode> nodes = new ArrayList<>();

        // Evaluate data elements (leaf nodes)
        for (DataElement element : clause.getDataElements()) {
            ElementResult elemResult = evaluateDataElement(patient, element, measure, mpStart, mpEnd);
            childResults.add(elemResult.isMet());
            nodes.add(elemResult.toNode());
        }

        // Evaluate child clauses recursively
        for (LogicalClause childClause : clause.getChildClauses()) {
            ClauseResult childResult = evaluateClause(patient, childClause, measure, mpStart, mpEnd);
            childResults.add(childResult.isMet());

            // Create group node for nested clause
            ValidationNode groupNode = new ValidationNode();
            groupNode.setId(childClause.getId());
            groupNode.setTitle(childClause.getDescription() != null ? childClause.getDescription() : childClause.getOperator() + " Group");
            groupNode.setType("collector");
            groupNode.setStatus(childResult.isMet() ? "pass" : "fail");
            groupNode.setChildren(childResult.getNodes());
            nodes.add(groupNode);
        }

        // Apply logical operator
        result.setMet(applyOperator(clause.getOperator(), childResults));
        result.setNodes(nodes);

        return result;
    }

    /**
     * Evaluate a single data element against patient data.
     */
    private ElementResult evaluateDataElement(TestPatient patient, DataElement element, Measure measure, String mpStart, String mpEnd) {
        ElementResult result = new ElementResult();
        result.setElementId(element.getId());
        result.setDescription(element.getDescription());
        result.setType(element.getElementType());

        List<ValidationFact> facts = new ArrayList<>();
        boolean met = false;

        switch (element.getElementType()) {
            case DEMOGRAPHIC:
                // Check gender value
                if (element.getGenderValue() != null) {
                    boolean genderMet = matchesGender(patient.getGender(), element.getGenderValue());
                    met = genderMet;
                    ValidationFact fact = new ValidationFact();
                    fact.setCode("sex");
                    fact.setDisplay(genderMet
                        ? String.format("Patient sex (%s) matches required (%s)", patient.getGender(), element.getGenderValue())
                        : String.format("Patient sex (%s) does not match required (%s)", patient.getGender(), element.getGenderValue()));
                    fact.setSource("demographics");
                    facts.add(fact);
                } else {
                    // Age check
                    met = evaluateAgeElement(patient, element, facts, mpStart, mpEnd);
                }
                break;

            case DIAGNOSIS:
                met = evaluateDiagnosis(patient, element, facts, mpStart, mpEnd);
                break;

            case ENCOUNTER:
                met = evaluateEncounter(patient, element, facts, mpStart, mpEnd);
                break;

            case PROCEDURE:
                met = evaluateProcedure(patient, element, facts, mpStart, mpEnd);
                break;

            case OBSERVATION:
                met = evaluateObservation(patient, element, facts, mpStart, mpEnd);
                break;

            case MEDICATION:
                met = evaluateMedication(patient, element, facts, mpStart, mpEnd);
                break;

            case IMMUNIZATION:
                met = evaluateImmunization(patient, element, facts, mpStart, mpEnd);
                break;

            default:
                // Generic assessment - try multiple types
                met = evaluateDiagnosis(patient, element, facts, mpStart, mpEnd) ||
                      evaluateEncounter(patient, element, facts, mpStart, mpEnd) ||
                      evaluateProcedure(patient, element, facts, mpStart, mpEnd) ||
                      evaluateObservation(patient, element, facts, mpStart, mpEnd);
                break;
        }

        result.setMet(met);
        result.setFacts(facts);
        return result;
    }

    /**
     * Evaluate age requirement from a data element.
     */
    private boolean evaluateAgeElement(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        if (patient.getBirthDate() == null) {
            return false;
        }

        LocalDate birthDate = patient.getBirthDate();
        LocalDate mpStartDate = LocalDate.parse(mpStart);
        LocalDate mpEndDate = LocalDate.parse(mpEnd);

        int ageAtStart = (int) ChronoUnit.YEARS.between(birthDate, mpStartDate);
        int ageAtEnd = (int) ChronoUnit.YEARS.between(birthDate, mpEndDate);

        ValidationFact ageFact = new ValidationFact();
        ageFact.setCode("AGE");
        ageFact.setDisplay(String.format("Age: %d at MP start, %d at MP end", ageAtStart, ageAtEnd));
        ageFact.setSource("Demographics");
        facts.add(ageFact);

        ThresholdRange thresholds = element.getThresholds();
        if (thresholds == null) {
            return true;
        }

        boolean met = true;
        if (thresholds.getAgeMin() != null && ageAtEnd < thresholds.getAgeMin()) {
            met = false;
        }
        if (thresholds.getAgeMax() != null && ageAtStart > thresholds.getAgeMax()) {
            met = false;
        }

        return met;
    }

    /**
     * Evaluate diagnosis elements.
     */
    private boolean evaluateDiagnosis(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> diagnoses = parseJsonArray(patient.getDiagnoses());
        for (Map<String, Object> dx : diagnoses) {
            String code = (String) dx.get("code");
            String display = (String) dx.get("display");
            String onsetDate = (String) dx.get("onsetDate");

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                if (checkTiming(onsetDate, mpStart, mpEnd)) {
                    ValidationFact fact = new ValidationFact();
                    fact.setCode(code);
                    fact.setDisplay(display);
                    fact.setDate(onsetDate);
                    fact.setSource("Problem List");
                    facts.add(fact);
                    return true;
                }
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching diagnosis found for: " + element.getDescription());
        noMatch.setSource("Diagnosis Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Evaluate encounter elements.
     */
    private boolean evaluateEncounter(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> encounters = parseJsonArray(patient.getEncounters());
        for (Map<String, Object> enc : encounters) {
            String code = (String) enc.get("code");
            String display = (String) enc.get("display");
            String date = (String) enc.get("date");

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                if (checkTiming(date, mpStart, mpEnd)) {
                    ValidationFact fact = new ValidationFact();
                    fact.setCode(code);
                    fact.setDisplay(display);
                    fact.setDate(date);
                    fact.setSource("Encounters");
                    facts.add(fact);
                    return true;
                }
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching encounter found for: " + element.getDescription());
        noMatch.setSource("Encounter Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Evaluate procedure elements.
     */
    private boolean evaluateProcedure(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> procedures = parseJsonArray(patient.getProcedures());
        for (Map<String, Object> proc : procedures) {
            String code = (String) proc.get("code");
            String display = (String) proc.get("display");
            String date = (String) proc.get("date");

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                if (checkTiming(date, mpStart, mpEnd)) {
                    ValidationFact fact = new ValidationFact();
                    fact.setCode(code);
                    fact.setDisplay(display);
                    fact.setDate(date);
                    fact.setSource("Procedures");
                    facts.add(fact);
                    return true;
                }
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching procedure found for: " + element.getDescription());
        noMatch.setSource("Procedure Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Evaluate observation elements.
     */
    private boolean evaluateObservation(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> observations = parseJsonArray(patient.getObservations());
        for (Map<String, Object> obs : observations) {
            String code = (String) obs.get("code");
            String display = (String) obs.get("display");
            String date = (String) obs.get("date");
            Object value = obs.get("value");
            String unit = (String) obs.get("unit");

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                if (checkTiming(date, mpStart, mpEnd)) {
                    // Check value thresholds if present
                    if (element.getThresholds() != null && value instanceof Number) {
                        double numValue = ((Number) value).doubleValue();
                        ThresholdRange t = element.getThresholds();
                        if (t.getValueMin() != null && numValue < t.getValueMin().doubleValue()) continue;
                        if (t.getValueMax() != null && numValue > t.getValueMax().doubleValue()) continue;
                    }

                    ValidationFact fact = new ValidationFact();
                    fact.setCode(code);
                    fact.setDisplay(display + (value != null ? ": " + value + (unit != null ? " " + unit : "") : ""));
                    fact.setDate(date);
                    fact.setSource("Observations");
                    facts.add(fact);
                    return true;
                }
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching observation found for: " + element.getDescription());
        noMatch.setSource("Observation Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Evaluate medication elements.
     */
    private boolean evaluateMedication(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> medications = parseJsonArray(patient.getMedications());
        for (Map<String, Object> med : medications) {
            String code = (String) med.get("code");
            String display = (String) med.get("display");
            String startDate = (String) med.get("startDate");

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                if (checkTiming(startDate, mpStart, mpEnd)) {
                    ValidationFact fact = new ValidationFact();
                    fact.setCode(code);
                    fact.setDisplay(display);
                    fact.setDate(startDate);
                    fact.setSource("Medications");
                    facts.add(fact);
                    return true;
                }
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching medication found for: " + element.getDescription());
        noMatch.setSource("Medication Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Evaluate immunization elements.
     */
    private boolean evaluateImmunization(TestPatient patient, DataElement element, List<ValidationFact> facts, String mpStart, String mpEnd) {
        List<Map<String, Object>> immunizations = parseJsonArray(patient.getImmunizations());
        for (Map<String, Object> imm : immunizations) {
            String code = (String) imm.get("code");
            String display = (String) imm.get("display");
            String date = (String) imm.get("date");
            String status = (String) imm.get("status");

            if (!"completed".equals(status)) continue;

            if (matchesDescription(element.getDescription(), display) || matchesCode(element, code)) {
                ValidationFact fact = new ValidationFact();
                fact.setCode(code);
                fact.setDisplay(display);
                fact.setDate(date);
                fact.setSource("Immunizations");
                facts.add(fact);
                return true;
            }
        }

        ValidationFact noMatch = new ValidationFact();
        noMatch.setCode("NO_MATCH");
        noMatch.setDisplay("No matching immunization found for: " + element.getDescription());
        noMatch.setSource("Immunization Evaluation");
        facts.add(noMatch);
        return false;
    }

    /**
     * Check gender requirement for measure.
     */
    private EvaluationResult checkGenderRequirement(TestPatient patient, Measure measure) {
        EvaluationResult result = new EvaluationResult();
        result.setCheckType("gender");

        Gender requiredGender = null;
        if (measure.getGlobalConstraints() != null) {
            requiredGender = measure.getGlobalConstraints().getGender();
        }

        if (requiredGender == null) {
            result.setMet(true);
            result.setDescription("No gender requirement");
            return result;
        }

        boolean met = matchesGender(patient.getGender(), requiredGender);
        result.setMet(met);
        result.setDescription(met
            ? String.format("Patient gender (%s) meets requirement (%s)", patient.getGender(), requiredGender)
            : String.format("Patient gender (%s) does not match required gender (%s)", patient.getGender(), requiredGender));

        return result;
    }

    /**
     * Check age requirement for measure.
     */
    private EvaluationResult checkAgeRequirement(TestPatient patient, Measure measure, String mpStart, String mpEnd) {
        EvaluationResult result = new EvaluationResult();
        result.setCheckType("age");

        if (patient.getBirthDate() == null) {
            result.setMet(false);
            result.setDescription("Patient birth date is unknown");
            return result;
        }

        LocalDate birthDate = patient.getBirthDate();
        LocalDate mpStartDate = LocalDate.parse(mpStart);
        LocalDate mpEndDate = LocalDate.parse(mpEnd);

        int ageAtStart = (int) ChronoUnit.YEARS.between(birthDate, mpStartDate);
        int ageAtEnd = (int) ChronoUnit.YEARS.between(birthDate, mpEndDate);

        GlobalConstraints gc = measure.getGlobalConstraints();
        if (gc == null || (gc.getAgeMin() == null && gc.getAgeMax() == null)) {
            result.setMet(true);
            result.setDescription(String.format("Age %d-%d at measurement period (no age requirement)", ageAtStart, ageAtEnd));
            return result;
        }

        boolean met = true;
        if (gc.getAgeMin() != null && ageAtEnd < gc.getAgeMin()) {
            met = false;
        }
        if (gc.getAgeMax() != null && ageAtStart > gc.getAgeMax()) {
            met = false;
        }

        result.setMet(met);
        result.setDescription(met
            ? String.format("Age %d-%d meets requirement (%d-%d)",
                ageAtStart, ageAtEnd, gc.getAgeMin() != null ? gc.getAgeMin() : 0, gc.getAgeMax() != null ? gc.getAgeMax() : 120)
            : String.format("Age %d-%d outside required range (%d-%d)",
                ageAtStart, ageAtEnd, gc.getAgeMin() != null ? gc.getAgeMin() : 0, gc.getAgeMax() != null ? gc.getAgeMax() : 120));

        return result;
    }

    /**
     * Apply logical operator to results.
     */
    private boolean applyOperator(LogicalOperator operator, List<Boolean> results) {
        if (results.isEmpty()) {
            return operator == LogicalOperator.AND;
        }

        switch (operator) {
            case AND:
                return results.stream().allMatch(r -> r);
            case OR:
                return results.stream().anyMatch(r -> r);
            case NOT:
                return results.size() > 0 && !results.get(0);
            default:
                return results.stream().allMatch(r -> r);
        }
    }

    /**
     * Find a population by type.
     */
    private Population findPopulationByType(Measure measure, String type) {
        return measure.getPopulations().stream()
            .filter(p -> p.getPopulationType() != null && p.getPopulationType().name().equalsIgnoreCase(type))
            .findFirst()
            .orElse(null);
    }

    /**
     * Check if patient gender matches required gender.
     */
    private boolean matchesGender(String patientGender, Gender required) {
        if (patientGender == null || required == null) {
            return true;
        }
        String normalized = patientGender.toLowerCase();
        return (required == Gender.FEMALE && normalized.equals("female")) ||
               (required == Gender.MALE && normalized.equals("male"));
    }

    /**
     * Check if description matches (fuzzy).
     */
    private boolean matchesDescription(String elementDescription, String dataDisplay) {
        if (elementDescription == null || dataDisplay == null) {
            return false;
        }
        String elemLower = elementDescription.toLowerCase();
        String dataLower = dataDisplay.toLowerCase();

        // Check for significant word overlap
        String[] elemWords = elemLower.split("\\s+");
        for (String word : elemWords) {
            if (word.length() > 3 && dataLower.contains(word)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if element has matching code.
     */
    private boolean matchesCode(DataElement element, String code) {
        // Check value sets
        for (MeasureValueSet vs : element.getValueSets()) {
            // Would need to parse value set codes from JSON
            // For now, return false as codes aren't directly accessible
        }
        return false;
    }

    /**
     * Check if date is within measurement period.
     */
    private boolean checkTiming(String date, String mpStart, String mpEnd) {
        if (date == null) {
            return false;
        }
        try {
            LocalDate eventDate = LocalDate.parse(date);
            LocalDate startDate = LocalDate.parse(mpStart);
            LocalDate endDate = LocalDate.parse(mpEnd);
            return !eventDate.isBefore(startDate) && !eventDate.isAfter(endDate);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generate narrative description of evaluation result.
     */
    private String generateNarrative(TestPatient patient, String outcome, Measure measure) {
        String measureTitle = measure.getTitle() != null ? measure.getTitle() : "the measure";

        switch (outcome) {
            case "in_numerator":
                return String.format("%s meets all criteria for %s and is included in the performance numerator.",
                    patient.getName(), measureTitle);
            case "not_in_numerator":
                return String.format("%s is in the denominator for %s but does not meet numerator criteria.",
                    patient.getName(), measureTitle);
            case "excluded":
                return String.format("%s meets exclusion criteria and is excluded from %s performance calculation.",
                    patient.getName(), measureTitle);
            case "not_in_population":
            default:
                return String.format("%s does not meet the initial population criteria for %s.",
                    patient.getName(), measureTitle);
        }
    }

    /**
     * Parse JSON array from string.
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

    // Inner classes for evaluation results

    public static class ValidationTrace {
        private String patientId;
        private String patientName;
        private String patientGender;
        private String narrative;
        private String finalOutcome;
        private List<EvaluationResult> preCheckResults = new ArrayList<>();
        private List<PopulationResult> populationResults = new ArrayList<>();
        private List<String> howClose;

        // Getters and setters
        public String getPatientId() { return patientId; }
        public void setPatientId(String patientId) { this.patientId = patientId; }
        public String getPatientName() { return patientName; }
        public void setPatientName(String patientName) { this.patientName = patientName; }
        public String getPatientGender() { return patientGender; }
        public void setPatientGender(String patientGender) { this.patientGender = patientGender; }
        public String getNarrative() { return narrative; }
        public void setNarrative(String narrative) { this.narrative = narrative; }
        public String getFinalOutcome() { return finalOutcome; }
        public void setFinalOutcome(String finalOutcome) { this.finalOutcome = finalOutcome; }
        public List<EvaluationResult> getPreCheckResults() { return preCheckResults; }
        public void setPreCheckResults(List<EvaluationResult> preCheckResults) { this.preCheckResults = preCheckResults; }
        public List<PopulationResult> getPopulationResults() { return populationResults; }
        public void setPopulationResults(List<PopulationResult> populationResults) { this.populationResults = populationResults; }
        public List<String> getHowClose() { return howClose; }
        public void setHowClose(List<String> howClose) { this.howClose = howClose; }
    }

    public static class EvaluationResult {
        private String checkType;
        private boolean met;
        private String description;

        public String getCheckType() { return checkType; }
        public void setCheckType(String checkType) { this.checkType = checkType; }
        public boolean isMet() { return met; }
        public void setMet(boolean met) { this.met = met; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    public static class PopulationResult {
        private String populationType;
        private boolean met;
        private List<ValidationNode> nodes = new ArrayList<>();

        public String getPopulationType() { return populationType; }
        public void setPopulationType(String populationType) { this.populationType = populationType; }
        public boolean isMet() { return met; }
        public void setMet(boolean met) { this.met = met; }
        public List<ValidationNode> getNodes() { return nodes; }
        public void setNodes(List<ValidationNode> nodes) { this.nodes = nodes; }
    }

    public static class ClauseResult {
        private String clauseId;
        private LogicalOperator operator;
        private boolean met;
        private List<ValidationNode> nodes = new ArrayList<>();

        public String getClauseId() { return clauseId; }
        public void setClauseId(String clauseId) { this.clauseId = clauseId; }
        public LogicalOperator getOperator() { return operator; }
        public void setOperator(LogicalOperator operator) { this.operator = operator; }
        public boolean isMet() { return met; }
        public void setMet(boolean met) { this.met = met; }
        public List<ValidationNode> getNodes() { return nodes; }
        public void setNodes(List<ValidationNode> nodes) { this.nodes = nodes; }
    }

    public static class ElementResult {
        private String elementId;
        private String description;
        private DataElementType type;
        private boolean met;
        private List<ValidationFact> facts = new ArrayList<>();

        public String getElementId() { return elementId; }
        public void setElementId(String elementId) { this.elementId = elementId; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public DataElementType getType() { return type; }
        public void setType(DataElementType type) { this.type = type; }
        public boolean isMet() { return met; }
        public void setMet(boolean met) { this.met = met; }
        public List<ValidationFact> getFacts() { return facts; }
        public void setFacts(List<ValidationFact> facts) { this.facts = facts; }

        public ValidationNode toNode() {
            ValidationNode node = new ValidationNode();
            node.setId(elementId);
            node.setTitle(description != null && description.length() > 50 ? description.substring(0, 50) : description);
            node.setType("decision");
            node.setDescription(description);
            node.setStatus(met ? "pass" : "fail");
            node.setFacts(facts);
            return node;
        }
    }

    public static class ValidationNode {
        private String id;
        private String title;
        private String type;
        private String description;
        private String status;
        private List<ValidationFact> facts;
        private List<ValidationNode> children;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public List<ValidationFact> getFacts() { return facts; }
        public void setFacts(List<ValidationFact> facts) { this.facts = facts; }
        public List<ValidationNode> getChildren() { return children; }
        public void setChildren(List<ValidationNode> children) { this.children = children; }
    }

    public static class ValidationFact {
        private String code;
        private String display;
        private String date;
        private String source;

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getDisplay() { return display; }
        public void setDisplay(String display) { this.display = display; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
    }
}
