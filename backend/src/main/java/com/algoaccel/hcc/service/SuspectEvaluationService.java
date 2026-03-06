package com.algoaccel.hcc.service;

import com.algoaccel.hcc.dto.*;
import com.algoaccel.hcc.model.HccSuppressionConfig;
import com.algoaccel.hcc.model.HccSuspectRule;
import com.algoaccel.hcc.model.StratificationTier;
import com.algoaccel.hcc.model.enums.HccModelType;
import com.algoaccel.hcc.model.enums.TierType;
import com.algoaccel.hcc.port.PatientDataPort;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for evaluating HCC suspect rules against patient data.
 * Supports temporal logic patterns for CKD and similar rules.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SuspectEvaluationService {

    private final HccRuleService hccRuleService;
    private final RejectionResurfacingService rejectionResurfacingService;
    private final PatientDataPort patientDataPort;
    private final ObjectMapper objectMapper;

    /**
     * Evaluate a patient against an HCC suspecting rule.
     */
    @Transactional(readOnly = true)
    public SuspectEvaluationResult evaluate(String patientId, Long ruleId, String clientId) {
        HccSuspectRule rule;
        if (clientId != null && !clientId.isEmpty()) {
            rule = hccRuleService.applyClientConfig(ruleId, clientId);
        } else {
            rule = hccRuleService.getRuleWithTiers(ruleId)
                    .orElseThrow(() -> new IllegalArgumentException("Rule not found: " + ruleId));
        }

        LocalDate windowEnd = LocalDate.now();
        LocalDate windowStart = windowEnd.minusYears(rule.getLookbackYears());

        List<SupportingFact> allSupportingFacts = new ArrayList<>();
        List<String> conceptAliasesTriggered = new ArrayList<>();
        Map<String, ModelEvaluationResult> modelResults = new HashMap<>();

        if (Boolean.TRUE.equals(rule.getCmsEnabled())) {
            ModelEvaluationResult cmsResult = evaluateForModel(
                    patientId, rule, HccModelType.CMS, windowStart, windowEnd, allSupportingFacts, conceptAliasesTriggered);
            modelResults.put("CMS", cmsResult);
        }

        if (Boolean.TRUE.equals(rule.getHhsEnabled())) {
            ModelEvaluationResult hhsResult = evaluateForModel(
                    patientId, rule, HccModelType.HHS, windowStart, windowEnd, allSupportingFacts, conceptAliasesTriggered);
            modelResults.put("HHS", hhsResult);
        }

        if (Boolean.TRUE.equals(rule.getEsrdEnabled())) {
            ModelEvaluationResult esrdResult = evaluateForModel(
                    patientId, rule, HccModelType.ESRD, windowStart, windowEnd, allSupportingFacts, conceptAliasesTriggered);
            modelResults.put("ESRD", esrdResult);
        }

        return SuspectEvaluationResult.builder()
                .patientId(patientId)
                .ruleId(rule.getId())
                .ruleName(rule.getName())
                .hccCategory(rule.getHccCategory())
                .conditionName(rule.getConditionName())
                .modelResults(modelResults)
                .supportingFacts(allSupportingFacts)
                .competingFacts(Collections.emptyList())
                .build();
    }

    private ModelEvaluationResult evaluateForModel(
            String patientId,
            HccSuspectRule rule,
            HccModelType modelType,
            LocalDate windowStart,
            LocalDate windowEnd,
            List<SupportingFact> allSupportingFacts,
            List<String> conceptAliasesTriggered) {

        HccSuppressionConfig suppressionConfig = rule.getSuppressionConfigs().stream()
                .filter(c -> c.getModelType() == modelType)
                .findFirst()
                .orElse(null);

        if (suppressionConfig != null) {
            Optional<HccSuppressionStatusDto> suppressionStatus =
                    patientDataPort.getSuppressionStatus(patientId, suppressionConfig.getTargetHcc(), modelType.name());

            if (suppressionStatus.isPresent() && suppressionStatus.get().isSuppressed()) {
                return ModelEvaluationResult.builder()
                        .modelType(modelType)
                        .stratification("NOT_SUSPECTED")
                        .suppressed(true)
                        .suppressionReason("Patient has validated " + suppressionConfig.getTargetHcc())
                        .supportingFacts(Collections.emptyList())
                        .firedBranchIds(Collections.emptyList())
                        .build();
            }
        }

        List<SupportingFact> modelSupportingFacts = new ArrayList<>();
        List<String> firedBranchIds = new ArrayList<>();
        String stratification = "NOT_SUSPECTED";

        Optional<StratificationTier> hsTier = rule.getTiers().stream()
                .filter(t -> t.getTierType() == TierType.HIGHLY_SUSPECTED)
                .findFirst();

        if (hsTier.isPresent()) {
            TierEvaluationResult hsResult = evaluateTier(patientId, hsTier.get(), windowStart, windowEnd);
            if (hsResult.fired) {
                stratification = "HIGHLY_SUSPECTED";
                modelSupportingFacts.addAll(hsResult.supportingFacts);
                firedBranchIds.addAll(hsResult.firedBranchIds);
                conceptAliasesTriggered.addAll(hsResult.conceptAliasesTriggered);
            }
        }

        if ("NOT_SUSPECTED".equals(stratification)) {
            Optional<StratificationTier> msTier = rule.getTiers().stream()
                    .filter(t -> t.getTierType() == TierType.MODERATELY_SUSPECTED)
                    .findFirst();

            if (msTier.isPresent()) {
                TierEvaluationResult msResult = evaluateTier(patientId, msTier.get(), windowStart, windowEnd);
                if (msResult.fired) {
                    stratification = "MODERATELY_SUSPECTED";
                    modelSupportingFacts.addAll(msResult.supportingFacts);
                    firedBranchIds.addAll(msResult.firedBranchIds);
                    conceptAliasesTriggered.addAll(msResult.conceptAliasesTriggered);
                }
            }
        }

        if (!"NOT_SUSPECTED".equals(stratification) && suppressionConfig != null &&
                Boolean.TRUE.equals(suppressionConfig.getResurfacingEnabled())) {

            boolean shouldSurface = rejectionResurfacingService.shouldSurface(
                    patientId, rule.getId(), modelType.name(), conceptAliasesTriggered);

            if (!shouldSurface) {
                return ModelEvaluationResult.builder()
                        .modelType(modelType)
                        .stratification("NOT_SUSPECTED")
                        .suppressed(true)
                        .suppressionReason("Previously rejected, same evidence present")
                        .supportingFacts(Collections.emptyList())
                        .firedBranchIds(Collections.emptyList())
                        .build();
            }
        }

        allSupportingFacts.addAll(modelSupportingFacts);

        return ModelEvaluationResult.builder()
                .modelType(modelType)
                .stratification(stratification)
                .suppressed(false)
                .supportingFacts(modelSupportingFacts)
                .firedBranchIds(firedBranchIds)
                .build();
    }

    private TierEvaluationResult evaluateTier(
            String patientId,
            StratificationTier tier,
            LocalDate windowStart,
            LocalDate windowEnd) {

        TierEvaluationResult result = new TierEvaluationResult();
        result.supportingFacts = new ArrayList<>();
        result.firedBranchIds = new ArrayList<>();
        result.conceptAliasesTriggered = new ArrayList<>();

        if (tier.getCriteriaJson() == null || tier.getCriteriaJson().isEmpty()) {
            return result;
        }

        try {
            List<JsonNode> branches = objectMapper.readValue(
                    tier.getCriteriaJson(), new TypeReference<List<JsonNode>>() {});

            int branchesFired = 0;

            for (JsonNode branch : branches) {
                String branchId = branch.has("branchId") ? branch.get("branchId").asText() : UUID.randomUUID().toString();
                String logic = branch.has("logic") ? branch.get("logic").asText() : "AND";
                JsonNode criteria = branch.get("criteria");

                if (criteria == null || !criteria.isArray()) {
                    continue;
                }

                BranchEvaluationResult branchResult = evaluateBranchWithTemporalLogic(
                        patientId, branchId, logic, criteria, windowStart, windowEnd);

                if (branchResult.fired) {
                    branchesFired++;
                    result.firedBranchIds.add(branchId);
                    result.supportingFacts.addAll(branchResult.supportingFacts);
                    result.conceptAliasesTriggered.addAll(branchResult.conceptAliasesTriggered);
                }
            }

            result.fired = branchesFired >= tier.getMinimumBranchesRequired();

        } catch (Exception e) {
            log.error("Error evaluating tier criteria: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Evaluates a branch with support for temporal constraints between criteria.
     * Two-pass evaluation:
     * 1. Evaluate each criterion and capture results
     * 2. Apply temporal constraints using captured results
     */
    private BranchEvaluationResult evaluateBranchWithTemporalLogic(
            String patientId,
            String branchId,
            String logic,
            JsonNode criteria,
            LocalDate windowStart,
            LocalDate windowEnd) {

        BranchEvaluationResult result = new BranchEvaluationResult();
        result.supportingFacts = new ArrayList<>();
        result.conceptAliasesTriggered = new ArrayList<>();

        // Map to store captured results by their captureAs name
        Map<String, CapturedResult> capturedResults = new HashMap<>();

        // First pass: evaluate criteria and capture results
        List<CriterionEvaluationContext> contexts = new ArrayList<>();
        for (JsonNode criterion : criteria) {
            CriterionEvaluationContext ctx = new CriterionEvaluationContext();
            ctx.criterion = criterion;
            ctx.negate = criterion.has("negate") && criterion.get("negate").asBoolean();
            ctx.captureAs = criterion.has("captureAs") ? criterion.get("captureAs").asText() : null;
            ctx.hasTemporalConstraint = criterion.has("temporalConstraint");

            // Evaluate the criterion
            ctx.evalResult = evaluateCriterionWithCapture(patientId, criterion, windowStart, windowEnd, capturedResults);

            // Store captured result if specified
            if (ctx.captureAs != null && ctx.evalResult.capturedResult != null) {
                capturedResults.put(ctx.captureAs, ctx.evalResult.capturedResult);
            }

            contexts.add(ctx);
        }

        // Second pass: apply temporal constraints and update captured results
        for (CriterionEvaluationContext ctx : contexts) {
            if (ctx.hasTemporalConstraint && ctx.evalResult.matched) {
                boolean temporalValid = applyTemporalConstraint(ctx.criterion, ctx.evalResult, capturedResults);
                if (!temporalValid) {
                    ctx.evalResult.matched = false;
                    ctx.evalResult.supportingFacts.clear();
                } else if (ctx.captureAs != null && ctx.evalResult.capturedResult != null) {
                    // Update captured result after temporal constraint narrows it down
                    capturedResults.put(ctx.captureAs, ctx.evalResult.capturedResult);
                }
            }
        }

        // Third pass: apply negation and collect results
        List<Boolean> criterionResults = new ArrayList<>();
        for (CriterionEvaluationContext ctx : contexts) {
            boolean finalResult = ctx.negate ? !ctx.evalResult.matched : ctx.evalResult.matched;
            criterionResults.add(finalResult);

            if (finalResult && !ctx.negate) {
                result.supportingFacts.addAll(ctx.evalResult.supportingFacts);
                result.conceptAliasesTriggered.addAll(ctx.evalResult.conceptAliasesTriggered);
            }
        }

        // Apply logic (AND/OR)
        if ("AND".equals(logic)) {
            result.fired = !criterionResults.isEmpty() && criterionResults.stream().allMatch(b -> b);
        } else {
            result.fired = criterionResults.stream().anyMatch(b -> b);
        }

        return result;
    }

    private CriterionEvaluationResultWithCapture evaluateCriterionWithCapture(
            String patientId,
            JsonNode criterion,
            LocalDate windowStart,
            LocalDate windowEnd,
            Map<String, CapturedResult> capturedResults) {

        CriterionEvaluationResultWithCapture result = new CriterionEvaluationResultWithCapture();
        result.supportingFacts = new ArrayList<>();
        result.conceptAliasesTriggered = new ArrayList<>();
        result.matched = false;

        String type = criterion.has("type") ? criterion.get("type").asText() : "";
        String conceptAlias = criterion.has("conceptAlias") ? criterion.get("conceptAlias").asText() : "";
        String qualifier = criterion.has("qualifier") ? criterion.get("qualifier").asText() : "";
        String resultSelector = criterion.has("resultSelector") ? criterion.get("resultSelector").asText() : "ANY";

        switch (type) {
            case "LAB":
                evaluateLabCriterionWithCapture(patientId, conceptAlias, qualifier, resultSelector,
                        criterion, windowStart, windowEnd, capturedResults, result);
                break;
            case "MEDICATION":
                evaluateMedicationCriterion(patientId, conceptAlias, criterion, windowStart, windowEnd, result);
                break;
            case "DIAGNOSIS":
                evaluateDiagnosisCriterion(patientId, conceptAlias, qualifier, result);
                break;
            default:
                log.warn("Unknown criterion type: {}", type);
        }

        return result;
    }

    private void evaluateLabCriterionWithCapture(
            String patientId,
            String conceptAlias,
            String qualifier,
            String resultSelector,
            JsonNode criterion,
            LocalDate windowStart,
            LocalDate windowEnd,
            Map<String, CapturedResult> capturedResults,
            CriterionEvaluationResultWithCapture result) {

        List<LabResultDto> labsRaw = patientDataPort.getLabResults(patientId, conceptAlias, windowStart, windowEnd);

        if (labsRaw.isEmpty()) {
            return;
        }

        // Copy to mutable list and sort by date (most recent first)
        List<LabResultDto> labs = new ArrayList<>(labsRaw);
        labs.sort((a, b) -> b.getResultDate().compareTo(a.getResultDate()));

        // Select which results to evaluate based on resultSelector
        List<LabResultDto> labsToEvaluate = selectLabResults(labs, resultSelector);

        for (LabResultDto lab : labsToEvaluate) {
            boolean matches = evaluateLabValue(lab, qualifier, criterion);

            if (matches) {
                result.matched = true;
                result.matchedLabs.add(lab);
                result.conceptAliasesTriggered.add(conceptAlias);
                result.supportingFacts.add(SupportingFact.builder()
                        .conceptAlias(conceptAlias)
                        .evidenceType("LAB")
                        .evidenceDate(lab.getResultDate())
                        .qualitativeResult(lab.getQualitativeResult())
                        .quantitativeResult(lab.getQuantitativeResult() != null ? lab.getQuantitativeResult().toString() : null)
                        .description("Lab: " + conceptAlias + " = " + lab.getQuantitativeResult())
                        .build());

                // For MOST_RECENT or FIRST, capture the single result
                if ("MOST_RECENT".equals(resultSelector) || "FIRST".equals(resultSelector)) {
                    result.capturedResult = new CapturedResult();
                    result.capturedResult.date = lab.getResultDate();
                    result.capturedResult.value = lab.getQuantitativeResult();
                    result.capturedResult.lab = lab;
                    break;
                }
            }
        }

        // For ANY selector, capture the most recent matching result
        if ("ANY".equals(resultSelector) && result.matched && !result.matchedLabs.isEmpty()) {
            LabResultDto mostRecentMatch = result.matchedLabs.stream()
                    .max(Comparator.comparing(LabResultDto::getResultDate))
                    .orElse(null);
            if (mostRecentMatch != null) {
                result.capturedResult = new CapturedResult();
                result.capturedResult.date = mostRecentMatch.getResultDate();
                result.capturedResult.value = mostRecentMatch.getQuantitativeResult();
                result.capturedResult.lab = mostRecentMatch;
            }
        }
    }

    private List<LabResultDto> selectLabResults(List<LabResultDto> labs, String resultSelector) {
        return switch (resultSelector) {
            case "MOST_RECENT" -> labs.isEmpty() ? Collections.emptyList() : Collections.singletonList(labs.get(0));
            case "FIRST" -> labs.isEmpty() ? Collections.emptyList() : Collections.singletonList(labs.get(labs.size() - 1));
            case "ALL" -> labs;
            default -> labs; // ANY - evaluate all, match if any matches
        };
    }

    private boolean evaluateLabValue(LabResultDto lab, String qualifier, JsonNode criterion) {
        if ("POSITIVE".equals(qualifier)) {
            return "POSITIVE".equalsIgnoreCase(lab.getQualitativeResult());
        } else if ("NEGATIVE".equals(qualifier)) {
            return "NEGATIVE".equalsIgnoreCase(lab.getQualitativeResult());
        } else if ("RANGE".equals(qualifier)) {
            return evaluateRangeQualifier(lab, criterion);
        } else if (lab.getQuantitativeResult() != null) {
            double value = lab.getQuantitativeResult().doubleValue();
            return switch (qualifier) {
                case "GREATER_THAN" -> criterion.has("threshold") && value > criterion.get("threshold").asDouble();
                case "GREATER_THAN_OR_EQUAL" -> criterion.has("threshold") && value >= criterion.get("threshold").asDouble();
                case "LESS_THAN" -> criterion.has("threshold") && value < criterion.get("threshold").asDouble();
                case "LESS_THAN_OR_EQUAL" -> criterion.has("threshold") && value <= criterion.get("threshold").asDouble();
                case "EQUALS" -> criterion.has("threshold") && value == criterion.get("threshold").asDouble();
                default -> false;
            };
        }
        return false;
    }

    private boolean evaluateRangeQualifier(LabResultDto lab, JsonNode criterion) {
        if (lab.getQuantitativeResult() == null) {
            return false;
        }

        double value = lab.getQuantitativeResult().doubleValue();
        double rangeMin = criterion.has("rangeMin") ? criterion.get("rangeMin").asDouble() : Double.MIN_VALUE;
        double rangeMax = criterion.has("rangeMax") ? criterion.get("rangeMax").asDouble() : Double.MAX_VALUE;
        boolean minInclusive = !criterion.has("rangeMinInclusive") || criterion.get("rangeMinInclusive").asBoolean();
        boolean maxInclusive = criterion.has("rangeMaxInclusive") && criterion.get("rangeMaxInclusive").asBoolean();

        boolean meetsMin = minInclusive ? value >= rangeMin : value > rangeMin;
        boolean meetsMax = maxInclusive ? value <= rangeMax : value < rangeMax;

        return meetsMin && meetsMax;
    }

    private boolean applyTemporalConstraint(
            JsonNode criterion,
            CriterionEvaluationResultWithCapture evalResult,
            Map<String, CapturedResult> capturedResults) {

        JsonNode temporalConstraint = criterion.get("temporalConstraint");
        if (temporalConstraint == null) {
            return true;
        }

        // Handle "relativeTo" constraint (e.g., "≥ 90 days before mostRecentQualifying")
        if (temporalConstraint.has("relativeTo")) {
            String relativeTo = temporalConstraint.get("relativeTo").asText();
            CapturedResult referenceResult = capturedResults.get(relativeTo);

            if (referenceResult == null || referenceResult.date == null) {
                return false;
            }

            String operator = temporalConstraint.has("operator") ? temporalConstraint.get("operator").asText() : "BEFORE";
            int minDays = temporalConstraint.has("minDays") ? temporalConstraint.get("minDays").asInt() : 0;

            // Check if any matched lab satisfies the temporal constraint
            boolean anyMatch = false;
            List<LabResultDto> validLabs = new ArrayList<>();

            for (LabResultDto lab : evalResult.matchedLabs) {
                long daysDiff = ChronoUnit.DAYS.between(lab.getResultDate(), referenceResult.date);

                boolean temporallyValid = switch (operator) {
                    case "BEFORE" -> daysDiff >= minDays;
                    case "AFTER" -> daysDiff <= -minDays;
                    case "SAME_DAY" -> daysDiff == 0;
                    default -> false;
                };

                if (temporallyValid) {
                    anyMatch = true;
                    validLabs.add(lab);
                }
            }

            // Update captured result to the valid lab if we need to reference it later
            if (anyMatch && !validLabs.isEmpty() && criterion.has("captureAs")) {
                LabResultDto capturedLab = validLabs.get(0); // Use first valid
                evalResult.capturedResult = new CapturedResult();
                evalResult.capturedResult.date = capturedLab.getResultDate();
                evalResult.capturedResult.value = capturedLab.getQuantitativeResult();
                evalResult.capturedResult.lab = capturedLab;
            }

            return anyMatch;
        }

        // Handle "after" and "before" constraint (between two captured results)
        if (temporalConstraint.has("after") && temporalConstraint.has("before")) {
            String afterRef = temporalConstraint.get("after").asText();
            String beforeRef = temporalConstraint.get("before").asText();

            CapturedResult afterResult = capturedResults.get(afterRef);
            CapturedResult beforeResult = capturedResults.get(beforeRef);

            if (afterResult == null || beforeResult == null ||
                    afterResult.date == null || beforeResult.date == null) {
                return false;
            }

            // Check if any matched lab falls between the two dates
            for (LabResultDto lab : evalResult.matchedLabs) {
                LocalDate labDate = lab.getResultDate();
                if (labDate.isAfter(afterResult.date) && labDate.isBefore(beforeResult.date)) {
                    return true;
                }
            }
            return false;
        }

        return true;
    }

    private void evaluateMedicationCriterion(
            String patientId,
            String conceptAlias,
            JsonNode criterion,
            LocalDate windowStart,
            LocalDate windowEnd,
            CriterionEvaluationResultWithCapture result) {

        String combinationType = criterion.has("combinationType") ? criterion.get("combinationType").asText() : null;

        List<MedicationOrderDto> meds = patientDataPort.getMedicationOrders(
                patientId, Collections.singletonList(conceptAlias), windowStart, windowEnd);

        for (MedicationOrderDto med : meds) {
            boolean matches = true;

            if (combinationType != null && med.getCombinationType() != null) {
                matches = combinationType.equals(med.getCombinationType().name());
            }

            if (matches) {
                result.matched = true;
                result.conceptAliasesTriggered.add(conceptAlias);
                result.supportingFacts.add(SupportingFact.builder()
                        .conceptAlias(conceptAlias)
                        .evidenceType("MEDICATION")
                        .evidenceDate(med.getStartDate())
                        .description("Medication: " + conceptAlias + (med.getCombinationType() != null ? " (" + med.getCombinationType() + ")" : ""))
                        .build());
            }
        }
    }

    private void evaluateDiagnosisCriterion(
            String patientId,
            String conceptAlias,
            String qualifier,
            CriterionEvaluationResultWithCapture result) {

        List<DiagnosisDto> diagnoses = patientDataPort.getDiagnoses(patientId, "CMS");

        boolean found = diagnoses.stream()
                .anyMatch(d -> conceptAlias.equals(d.getHccCategory()) || conceptAlias.equals(d.getIcdCode()));

        if ("PRESENT".equals(qualifier) && found) {
            result.matched = true;
            result.conceptAliasesTriggered.add(conceptAlias);
        } else if ("ABSENT".equals(qualifier) && !found) {
            result.matched = true;
        }
    }

    // Inner classes for evaluation results
    private static class TierEvaluationResult {
        boolean fired;
        List<SupportingFact> supportingFacts;
        List<String> firedBranchIds;
        List<String> conceptAliasesTriggered;
    }

    private static class BranchEvaluationResult {
        boolean fired;
        List<SupportingFact> supportingFacts;
        List<String> conceptAliasesTriggered;
    }

    private static class CriterionEvaluationContext {
        JsonNode criterion;
        boolean negate;
        String captureAs;
        boolean hasTemporalConstraint;
        CriterionEvaluationResultWithCapture evalResult;
    }

    private static class CriterionEvaluationResultWithCapture {
        boolean matched;
        List<SupportingFact> supportingFacts = new ArrayList<>();
        List<String> conceptAliasesTriggered = new ArrayList<>();
        List<LabResultDto> matchedLabs = new ArrayList<>();
        CapturedResult capturedResult;
    }

    private static class CapturedResult {
        LocalDate date;
        BigDecimal value;
        LabResultDto lab;
    }
}
