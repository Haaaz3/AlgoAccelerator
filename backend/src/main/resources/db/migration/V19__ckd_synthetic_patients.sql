-- V19: Synthetic patient data for CKD HCC rule testing
-- Patients exercising all CKD temporal patterns, suppression, and competing facts

-- ============================================================================
-- PATIENTS (20 CKD patients)
-- ============================================================================

-- CKD Stage 3 (Rule 2, HCC 326, ESRD only)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('CKD001', 62, 'M', 'ESRD'),  -- IS suspected: sustained eGFR 30-59
('CKD002', 55, 'F', 'ESRD'),  -- NOT suspected: only 1 eGFR value
('CKD003', 68, 'M', 'ESRD'),  -- NOT suspected: recovery (eGFR ≥60 in between)
('CKD004', 71, 'F', 'ESRD');  -- Suppressed: has validated HCC 326

-- CKD Stage 3B (Rule 3, HCC 327, CMS only)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('CKD005', 58, 'M', 'CMS'),   -- IS suspected: sustained eGFR 30-44
('CKD006', 64, 'F', 'CMS'),   -- NOT suspected: values only 60 days apart
('CKD007', 72, 'M', 'CMS');   -- Suppressed: has validated HCC 327

-- CKD Stage 3A (Rule 4, HCC 328, CMS only)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('CKD008', 59, 'F', 'CMS'),   -- IS suspected: sustained eGFR 45-59
('CKD009', 66, 'M', 'CMS'),   -- NOT suspected: recovery in between
('CKD010', 73, 'F', 'CMS');   -- Suppressed: has validated HCC 328

-- CKD Stage 4 (Rule 5, HCC 329, CMS/HHS/ESRD)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('CKD011', 67, 'M', 'CMS'),   -- IS suspected: sustained eGFR 15-29
('CKD012', 61, 'F', 'HHS'),   -- NOT suspected: values only 45 days apart
('CKD013', 74, 'M', 'CMS'),   -- Suppressed CMS: has validated HCC 329
('CKD014', 69, 'F', 'HHS'),   -- Suppressed HHS: has validated HCC 329
('CKD015', 76, 'M', 'ESRD');  -- Suppressed ESRD: has validated HCC 329

-- CKD Stage 5 (Rule 6, HCC 330, CMS/HHS/ESRD + Renal Transplant competing)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('CKD016', 70, 'F', 'CMS'),   -- IS suspected: sustained eGFR <15, no transplant
('CKD017', 65, 'M', 'CMS'),   -- NOT suspected: has Renal Transplant
('CKD018', 72, 'F', 'HHS'),   -- NOT suspected: recovery in between
('CKD019', 77, 'M', 'CMS'),   -- Suppressed CMS: has validated HCC 330
('CKD020', 68, 'F', 'HHS');   -- Suppressed HHS: has validated HCC 330

-- ============================================================================
-- LAB RESULTS (eGFR values)
-- ============================================================================

-- CKD001: IS suspected Stage 3 - eGFR 35 (recent) and 40 (120 days earlier)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD001', 'EGFR_CLIN', '2026-02-15', 35),
('CKD001', 'EGFR_CLIN', '2025-10-15', 40);

-- CKD002: NOT suspected - only 1 eGFR value
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD002', 'EGFR_CLIN', '2026-02-01', 42);

-- CKD003: NOT suspected - recovery (eGFR 65 between two qualifying values)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD003', 'EGFR_CLIN', '2026-02-20', 38),
('CKD003', 'EGFR_CLIN', '2025-12-01', 65),  -- Recovery!
('CKD003', 'EGFR_CLIN', '2025-10-01', 45);

-- CKD004: Suppressed - has evidence but suppressed by validated HCC
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD004', 'EGFR_CLIN', '2026-02-10', 32),
('CKD004', 'EGFR_CLIN', '2025-10-10', 38);

-- CKD005: IS suspected Stage 3B - eGFR 32 (recent) and 38 (100 days earlier)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD005', 'EGFR_CLIN', '2026-02-18', 32),
('CKD005', 'EGFR_CLIN', '2025-11-10', 38);

-- CKD006: NOT suspected - values only 60 days apart (need 90+)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD006', 'EGFR_CLIN', '2026-02-15', 34),
('CKD006', 'EGFR_CLIN', '2025-12-17', 36);

-- CKD007: Suppressed Stage 3B - has evidence but suppressed
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD007', 'EGFR_CLIN', '2026-02-12', 33),
('CKD007', 'EGFR_CLIN', '2025-10-12', 37);

-- CKD008: IS suspected Stage 3A - eGFR 48 (recent) and 52 (95 days earlier)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD008', 'EGFR_CLIN', '2026-02-20', 48),
('CKD008', 'EGFR_CLIN', '2025-11-17', 52);

-- CKD009: NOT suspected Stage 3A - recovery in between
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD009', 'EGFR_CLIN', '2026-02-22', 50),
('CKD009', 'EGFR_CLIN', '2025-12-15', 68),  -- Recovery!
('CKD009', 'EGFR_CLIN', '2025-10-15', 55);

-- CKD010: Suppressed Stage 3A
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD010', 'EGFR_CLIN', '2026-02-08', 47),
('CKD010', 'EGFR_CLIN', '2025-10-08', 53);

-- CKD011: IS suspected Stage 4 - eGFR 18 (recent) and 22 (110 days earlier)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD011', 'EGFR_CLIN', '2026-02-25', 18),
('CKD011', 'EGFR_CLIN', '2025-11-07', 22);

-- CKD012: NOT suspected Stage 4 - values only 45 days apart
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD012', 'EGFR_CLIN', '2026-02-20', 20),
('CKD012', 'EGFR_CLIN', '2026-01-06', 25);

-- CKD013-015: Suppressed Stage 4 (various models)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD013', 'EGFR_CLIN', '2026-02-15', 19),
('CKD013', 'EGFR_CLIN', '2025-10-15', 23),
('CKD014', 'EGFR_CLIN', '2026-02-18', 21),
('CKD014', 'EGFR_CLIN', '2025-10-18', 26),
('CKD015', 'EGFR_CLIN', '2026-02-22', 17),
('CKD015', 'EGFR_CLIN', '2025-10-22', 24);

-- CKD016: IS suspected Stage 5 - eGFR 8 (recent) and 12 (100 days earlier), no transplant
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD016', 'EGFR_CLIN', '2026-02-28', 8),
('CKD016', 'EGFR_CLIN', '2025-11-20', 12);

-- CKD017: NOT suspected Stage 5 - has Renal Transplant (competing fact)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD017', 'EGFR_CLIN', '2026-02-25', 10),
('CKD017', 'EGFR_CLIN', '2025-11-15', 13);

-- CKD018: NOT suspected Stage 5 - recovery in between
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD018', 'EGFR_CLIN', '2026-02-22', 11),
('CKD018', 'EGFR_CLIN', '2025-12-20', 18),  -- Recovery (>=15)!
('CKD018', 'EGFR_CLIN', '2025-10-20', 14);

-- CKD019-020: Suppressed Stage 5
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, quantitative_result) VALUES
('CKD019', 'EGFR_CLIN', '2026-02-18', 9),
('CKD019', 'EGFR_CLIN', '2025-10-18', 11),
('CKD020', 'EGFR_CLIN', '2026-02-20', 7),
('CKD020', 'EGFR_CLIN', '2025-10-20', 13);

-- ============================================================================
-- DIAGNOSES (for suppression and competing facts)
-- ============================================================================

-- Suppressed patients: Already have validated HCC for their CKD stage
INSERT INTO hcc_diagnosis (patient_id, icd_code, hcc_category, model_type, suppression_status) VALUES
('CKD004', 'N18.3', 'HCC 326', 'ESRD', 'Fully Validated'),
('CKD007', 'N18.32', 'HCC 327', 'CMS', 'Fully Validated'),
('CKD010', 'N18.31', 'HCC 328', 'CMS', 'Fully Validated'),
('CKD013', 'N18.4', 'HCC 329', 'CMS', 'Fully Validated'),
('CKD014', 'N18.4', 'HCC 329', 'HHS', 'Needs Administrative Attention'),
('CKD015', 'N18.4', 'HCC 329', 'ESRD', 'Needs Clinical and Administrative Attention'),
('CKD019', 'N18.5', 'HCC 330', 'CMS', 'Fully Validated'),
('CKD020', 'N18.5', 'HCC 330', 'HHS', 'Fully Validated');

-- CKD017: Renal Transplant Status (competing fact for Stage 5)
INSERT INTO hcc_diagnosis (patient_id, icd_code, hcc_category, model_type, suppression_status) VALUES
('CKD017', 'Z94.0', 'RENAL_TRANSPLANT_STATUS', 'CMS', 'Fully Validated');
