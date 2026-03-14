-- V17: HIV/AIDS HCC 1 Suspecting Rule seed data
-- Canonical reference rule per the HIV spec document

-- ============================================================================
-- HIV/AIDS SUSPECT RULE
-- ============================================================================

INSERT INTO hcc_suspect_rule (
    id, name, hcc_category, condition_name,
    cms_enabled, hhs_enabled, esrd_enabled,
    status, model_year, lookback_years, version,
    created_at, updated_at
) VALUES (
    1, 'HIV/AIDS Suspecting Rule', 'HCC 1', 'HIV/AIDS',
    true, true, true,
    'PUBLISHED', 'v28', 2, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- ============================================================================
-- STRATIFICATION TIERS
-- ============================================================================

-- HS (Highly Suspected) Tier
-- Criteria branches (OR logic at top level):
-- 1. 2+ positive HIV tests on separate dates
-- 2. Combination ART medication in measurement period
-- 3. Positive HIV test + Component ART medication
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    1, 'HIGHLY_SUSPECTED', 1,
    '[
        {
            "branchId": "hs-branch-1-two-positive-tests",
            "label": "Two Positive HIV Tests",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_POSITIVE_CLIN",
                    "qualifier": "POSITIVE",
                    "minOccurrences": 2,
                    "requireSeparateDates": true
                }
            ]
        },
        {
            "branchId": "hs-branch-2-combination-art",
            "label": "Combination ART Medication",
            "logic": "OR",
            "criteria": [
                {
                    "type": "MEDICATION",
                    "conceptAlias": "BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED",
                    "combinationType": "COMBINATION",
                    "notOverlappingLastSuppression": true
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "DOLUTEGRAVIR_ABACAVIR_LAMIVUDINE_MED",
                    "combinationType": "COMBINATION",
                    "notOverlappingLastSuppression": true
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "EFAVIRENZ_EMTRICITABINE_TENOFOVIR_MED",
                    "combinationType": "COMBINATION",
                    "notOverlappingLastSuppression": true
                }
            ]
        },
        {
            "branchId": "hs-branch-3-test-plus-component",
            "label": "Positive Test + Component ART",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_POSITIVE_CLIN",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "EMTRICITABINE_MED",
                    "combinationType": "COMPONENT"
                }
            ]
        },
        {
            "branchId": "hs-branch-3b-test-plus-component-alt",
            "label": "Positive Test + Component ART (Dolutegravir)",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "DOLUTEGRAVIR_MED",
                    "combinationType": "COMPONENT"
                }
            ]
        },
        {
            "branchId": "hs-branch-3c-test-plus-component-abacavir",
            "label": "Positive Test + Component ART (Abacavir)",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_POSITIVE_CLIN",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "ABACAVIR_MED",
                    "combinationType": "COMPONENT"
                }
            ]
        },
        {
            "branchId": "hs-branch-3d-test-plus-component-raltegravir",
            "label": "Positive Test + Component ART (Raltegravir)",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "RALTEGRAVIR_MED",
                    "combinationType": "COMPONENT"
                }
            ]
        },
        {
            "branchId": "hs-branch-3e-test-plus-component-darunavir",
            "label": "Positive Test + Component ART (Darunavir)",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_POSITIVE_CLIN",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "DARUNAVIR_MED",
                    "combinationType": "COMPONENT"
                }
            ]
        }
    ]',
    '[
        {"alias": "HIV_TEST_POSITIVE_CLIN", "label": "HIV Test Positive"},
        {"alias": "HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE", "label": "HIV Quantitative Test"},
        {"alias": "BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED", "label": "Biktarvy (Combination ART)"},
        {"alias": "DOLUTEGRAVIR_ABACAVIR_LAMIVUDINE_MED", "label": "Triumeq (Combination ART)"},
        {"alias": "EFAVIRENZ_EMTRICITABINE_TENOFOVIR_MED", "label": "Atripla (Combination ART)"},
        {"alias": "EMTRICITABINE_MED", "label": "Emtricitabine (Component)"},
        {"alias": "DOLUTEGRAVIR_MED", "label": "Dolutegravir (Component)"},
        {"alias": "ABACAVIR_MED", "label": "Abacavir (Component)"},
        {"alias": "RALTEGRAVIR_MED", "label": "Raltegravir (Component)"},
        {"alias": "DARUNAVIR_MED", "label": "Darunavir (Component)"}
    ]'
);

-- MS (Moderately Suspected) Tier
-- Criteria: Positive HIV test + low-specificity medication (Lamivudine or Tenofovir alone)
INSERT INTO hcc_stratification_tier (
    rule_id, tier_type, minimum_branches_required, criteria_json, supporting_facts_json
) VALUES (
    1, 'MODERATELY_SUSPECTED', 1,
    '[
        {
            "branchId": "ms-branch-1-test-plus-lamivudine",
            "label": "Positive Test + Lamivudine",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_POSITIVE_CLIN",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "LAMIVUDINE_MED",
                    "combinationType": "COMPONENT",
                    "notOverlappingLastSuppression": true
                }
            ]
        },
        {
            "branchId": "ms-branch-2-test-plus-tenofovir",
            "label": "Positive Test + Tenofovir",
            "logic": "AND",
            "criteria": [
                {
                    "type": "LAB",
                    "conceptAlias": "HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE",
                    "qualifier": "POSITIVE"
                },
                {
                    "type": "MEDICATION",
                    "conceptAlias": "TENOFOVIR_MED",
                    "combinationType": "COMPONENT",
                    "notOverlappingLastSuppression": true
                }
            ]
        }
    ]',
    '[
        {"alias": "HIV_TEST_POSITIVE_CLIN", "label": "HIV Test Positive"},
        {"alias": "HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE", "label": "HIV Quantitative Test"},
        {"alias": "LAMIVUDINE_MED", "label": "Lamivudine (Low Specificity)"},
        {"alias": "TENOFOVIR_MED", "label": "Tenofovir (Low Specificity)"}
    ]'
);

-- ============================================================================
-- SUPPRESSION CONFIGS (one per model type)
-- ============================================================================

-- CMS suppression config
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    1, 'CMS', 'HCC 1',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- HHS suppression config
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    1, 'HHS', 'HCC 1',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- ESRD suppression config
INSERT INTO hcc_suppression_config (
    rule_id, model_type, target_hcc, suppression_states,
    resurfacing_enabled, resurfacing_requires_different_concept
) VALUES (
    1, 'ESRD', 'HCC 1',
    '["Fully Validated", "Needs Administrative Attention", "Needs Clinical and Administrative Attention"]',
    true, true
);

-- ============================================================================
-- REJECTION STATES (for resurfacing scenarios)
-- Must be inserted after the rule is created
-- ============================================================================

-- PAT024: Rejected last month with LAMIVUDINE_MED as trigger
-- Same med refill present (LAMIVUDINE_MED) -> should stay suppressed
INSERT INTO hcc_rule_rejection_state (patient_id, rule_id, model_type, rejected_at, last_triggering_concept_alias) VALUES
('PAT024', 1, 'CMS', '2026-01-15', 'LAMIVUDINE_MED');

-- PAT025: Rejected last month with LAMIVUDINE_MED as trigger
-- Different med now present (BICTEGRAVIR combo) -> should resurface
INSERT INTO hcc_rule_rejection_state (patient_id, rule_id, model_type, rejected_at, last_triggering_concept_alias) VALUES
('PAT025', 1, 'CMS', '2026-01-15', 'LAMIVUDINE_MED');
