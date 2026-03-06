-- V18: CKD (Chronic Kidney Disease) HCC Suspecting Rules
-- 5 CKD rules using temporal eGFR pattern per spec

-- ============================================================================
-- RULE 2: CKD Stage 3 (eGFR 30-59)
-- Suppression: ESRD only
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    2, 'CKD Stage 3 Suspecting Rule', 'HCC 326', 'Chronic Kidney Disease Stage 3',
    false, false, true,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CKD Stage 3 HS Tier (eGFR 30-59, sustained over 90+ days)
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    2, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "ckd3-hs-egfr-temporal",
            "label": "Sustained eGFR 30-59 over 90+ days",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "resultSelector": "MOST_RECENT",
                    "qualifier": "RANGE",
                    "rangeMin": 30,
                    "rangeMax": 60,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "mostRecentQualifying"
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "LESS_THAN",
                    "threshold": 60,
                    "captureAs": "additionalQualifying",
                    "temporalConstraint": {
                        "relativeTo": "mostRecentQualifying",
                        "operator": "BEFORE",
                        "minDays": 90
                    }
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "GREATER_THAN_OR_EQUAL",
                    "threshold": 60,
                    "negate": true,
                    "temporalConstraint": {
                        "after": "additionalQualifying",
                        "before": "mostRecentQualifying"
                    }
                }
            ]
        }
    ]',
    '[
        {"alias": "EGFR_CLIN", "label": "eGFR (mL/min/1.73m2)"}
    ]'
);

-- CKD Stage 3 Suppression Config (ESRD only)
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    2, 'ESRD', 'HCC 326',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- ============================================================================
-- RULE 3: CKD Stage 3B (eGFR 30-44)
-- Suppression: CMS only
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    3, 'CKD Stage 3B Suspecting Rule', 'HCC 327', 'Chronic Kidney Disease Stage 3B',
    true, false, false,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CKD Stage 3B HS Tier (eGFR 30-44, sustained over 90+ days)
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    3, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "ckd3b-hs-egfr-temporal",
            "label": "Sustained eGFR 30-44 over 90+ days",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "resultSelector": "MOST_RECENT",
                    "qualifier": "RANGE",
                    "rangeMin": 30,
                    "rangeMax": 45,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "mostRecentQualifying"
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "RANGE",
                    "rangeMin": 30,
                    "rangeMax": 45,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "additionalQualifying",
                    "temporalConstraint": {
                        "relativeTo": "mostRecentQualifying",
                        "operator": "BEFORE",
                        "minDays": 90
                    }
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "GREATER_THAN_OR_EQUAL",
                    "threshold": 45,
                    "negate": true,
                    "temporalConstraint": {
                        "after": "additionalQualifying",
                        "before": "mostRecentQualifying"
                    }
                }
            ]
        }
    ]',
    '[
        {"alias": "EGFR_CLIN", "label": "eGFR (mL/min/1.73m2)"}
    ]'
);

-- CKD Stage 3B Suppression Config (CMS only)
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    3, 'CMS', 'HCC 327',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- ============================================================================
-- RULE 4: CKD Stage 3 Except 3B (eGFR 45-59, aka Stage 3A)
-- Suppression: CMS only
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    4, 'CKD Stage 3 Except 3B Suspecting Rule', 'HCC 328', 'Chronic Kidney Disease Stage 3A',
    true, false, false,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CKD Stage 3A HS Tier (eGFR 45-59, sustained over 90+ days)
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    4, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "ckd3a-hs-egfr-temporal",
            "label": "Sustained eGFR 45-59 over 90+ days",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "resultSelector": "MOST_RECENT",
                    "qualifier": "RANGE",
                    "rangeMin": 45,
                    "rangeMax": 60,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "mostRecentQualifying"
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "RANGE",
                    "rangeMin": 45,
                    "rangeMax": 60,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "additionalQualifying",
                    "temporalConstraint": {
                        "relativeTo": "mostRecentQualifying",
                        "operator": "BEFORE",
                        "minDays": 90
                    }
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "GREATER_THAN_OR_EQUAL",
                    "threshold": 60,
                    "negate": true,
                    "temporalConstraint": {
                        "after": "additionalQualifying",
                        "before": "mostRecentQualifying"
                    }
                }
            ]
        }
    ]',
    '[
        {"alias": "EGFR_CLIN", "label": "eGFR (mL/min/1.73m2)"}
    ]'
);

-- CKD Stage 3A Suppression Config (CMS only)
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    4, 'CMS', 'HCC 328',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- ============================================================================
-- RULE 5: CKD Stage 4 (eGFR 15-29)
-- Suppression: CMS, HHS, ESRD
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    5, 'CKD Stage 4 Suspecting Rule', 'HCC 329', 'Chronic Kidney Disease Stage 4',
    true, true, true,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CKD Stage 4 HS Tier (eGFR 15-29, sustained over 90+ days)
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    5, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "ckd4-hs-egfr-temporal",
            "label": "Sustained eGFR 15-29 over 90+ days",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "resultSelector": "MOST_RECENT",
                    "qualifier": "RANGE",
                    "rangeMin": 15,
                    "rangeMax": 30,
                    "rangeMinInclusive": true,
                    "rangeMaxInclusive": false,
                    "captureAs": "mostRecentQualifying"
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "LESS_THAN",
                    "threshold": 30,
                    "captureAs": "additionalQualifying",
                    "temporalConstraint": {
                        "relativeTo": "mostRecentQualifying",
                        "operator": "BEFORE",
                        "minDays": 90
                    }
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "GREATER_THAN_OR_EQUAL",
                    "threshold": 30,
                    "negate": true,
                    "temporalConstraint": {
                        "after": "additionalQualifying",
                        "before": "mostRecentQualifying"
                    }
                }
            ]
        }
    ]',
    '[
        {"alias": "EGFR_CLIN", "label": "eGFR (mL/min/1.73m2)"}
    ]'
);

-- CKD Stage 4 Suppression Configs (CMS, HHS, ESRD)
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES
(5, 'CMS', 'HCC 329', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true),
(5, 'HHS', 'HCC 329', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true),
(5, 'ESRD', 'HCC 329', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true);

-- ============================================================================
-- RULE 6: CKD Stage 5 (eGFR <15)
-- Suppression: CMS, HHS, ESRD
-- Competing Fact: Renal Transplant Status
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    6, 'CKD Stage 5 Suspecting Rule', 'HCC 330', 'Chronic Kidney Disease Stage 5',
    true, true, true,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CKD Stage 5 HS Tier (eGFR <15, sustained over 90+ days)
-- Note: Also includes competing fact exclusion for Renal Transplant
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    6, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "ckd5-hs-egfr-temporal",
            "label": "Sustained eGFR <15 over 90+ days without Transplant",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "resultSelector": "MOST_RECENT",
                    "qualifier": "LESS_THAN",
                    "threshold": 15,
                    "captureAs": "mostRecentQualifying"
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "LESS_THAN",
                    "threshold": 15,
                    "captureAs": "additionalQualifying",
                    "temporalConstraint": {
                        "relativeTo": "mostRecentQualifying",
                        "operator": "BEFORE",
                        "minDays": 90
                    }
                },
                {
                    "type": "LAB",
                    "conceptAlias": "EGFR_CLIN",
                    "qualifier": "GREATER_THAN_OR_EQUAL",
                    "threshold": 15,
                    "negate": true,
                    "temporalConstraint": {
                        "after": "additionalQualifying",
                        "before": "mostRecentQualifying"
                    }
                },
                {
                    "type": "DIAGNOSIS",
                    "conceptAlias": "RENAL_TRANSPLANT_STATUS",
                    "qualifier": "ABSENT",
                    "negate": false
                }
            ]
        }
    ]',
    '[
        {"alias": "EGFR_CLIN", "label": "eGFR (mL/min/1.73m2)"},
        {"alias": "RENAL_TRANSPLANT_STATUS", "label": "Renal Transplant Status (Competing)"}
    ]'
);

-- CKD Stage 5 Suppression Configs (CMS, HHS, ESRD)
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES
(6, 'CMS', 'HCC 330', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true),
(6, 'HHS', 'HCC 330', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true),
(6, 'ESRD', 'HCC 330', '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]', true, true);
