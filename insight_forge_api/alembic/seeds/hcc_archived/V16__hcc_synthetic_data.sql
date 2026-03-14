-- V16: Synthetic patient data for HCC HIV/AIDS rule testing
-- 25 patients exercising every branch of the HIV/AIDS HCC 1 rule

-- ============================================================================
-- PATIENTS (25 total)
-- ============================================================================

-- PAT001-PAT005: HS via combination ART medication
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT001', 45, 'M', 'CMS'),
('PAT002', 38, 'F', 'CMS'),
('PAT003', 52, 'M', 'HHS'),
('PAT004', 29, 'F', 'HHS'),
('PAT005', 61, 'M', 'ESRD');

-- PAT006-PAT010: HS via 2 positive HIV tests on separate dates
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT006', 34, 'M', 'CMS'),
('PAT007', 41, 'F', 'CMS'),
('PAT008', 55, 'M', 'HHS'),
('PAT009', 27, 'F', 'HHS'),
('PAT010', 48, 'M', 'ESRD');

-- PAT011-PAT015: HS via positive HIV test + component ART medication
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT011', 36, 'M', 'CMS'),
('PAT012', 44, 'F', 'CMS'),
('PAT013', 50, 'M', 'HHS'),
('PAT014', 32, 'F', 'HHS'),
('PAT015', 58, 'M', 'ESRD');

-- PAT016-PAT020: MS via positive HIV test + Lamivudine/Tenofovir (low specificity)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT016', 40, 'M', 'CMS'),
('PAT017', 35, 'F', 'CMS'),
('PAT018', 47, 'M', 'HHS'),
('PAT019', 28, 'F', 'HHS'),
('PAT020', 53, 'M', 'ESRD');

-- PAT021-PAT023: Suppressed (already have CMS HCC 1 validated)
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT021', 42, 'M', 'CMS'),
('PAT022', 39, 'F', 'CMS'),
('PAT023', 56, 'M', 'HHS');

-- PAT024-PAT025: Rejection resurfacing scenarios
INSERT INTO hcc_patient (patient_id, age, sex, enrollment_type) VALUES
('PAT024', 37, 'M', 'CMS'),
('PAT025', 46, 'F', 'CMS');

-- ============================================================================
-- LAB RESULTS
-- ============================================================================

-- PAT006-PAT010: 2 positive HIV tests on separate dates (HS criteria)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, qualitative_result) VALUES
('PAT006', 'HIV_TEST_POSITIVE_CLIN', '2026-01-15', 'POSITIVE'),
('PAT006', 'HIV_TEST_POSITIVE_CLIN', '2026-02-20', 'POSITIVE'),
('PAT007', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-01-10', 'POSITIVE'),
('PAT007', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-03-01', 'POSITIVE'),
('PAT008', 'HIV_TEST_POSITIVE_CLIN', '2026-02-01', 'POSITIVE'),
('PAT008', 'HIV_TEST_POSITIVE_CLIN', '2026-02-28', 'POSITIVE'),
('PAT009', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-01-20', 'POSITIVE'),
('PAT009', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-02-15', 'POSITIVE'),
('PAT010', 'HIV_TEST_POSITIVE_CLIN', '2026-01-05', 'POSITIVE'),
('PAT010', 'HIV_TEST_POSITIVE_CLIN', '2026-02-10', 'POSITIVE');

-- PAT011-PAT015: Single positive HIV test (for HS with component med)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, qualitative_result) VALUES
('PAT011', 'HIV_TEST_POSITIVE_CLIN', '2026-01-25', 'POSITIVE'),
('PAT012', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-02-05', 'POSITIVE'),
('PAT013', 'HIV_TEST_POSITIVE_CLIN', '2026-01-30', 'POSITIVE'),
('PAT014', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-02-10', 'POSITIVE'),
('PAT015', 'HIV_TEST_POSITIVE_CLIN', '2026-01-18', 'POSITIVE');

-- PAT016-PAT020: Single positive HIV test (for MS with low-specificity med)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, qualitative_result) VALUES
('PAT016', 'HIV_TEST_POSITIVE_CLIN', '2026-01-22', 'POSITIVE'),
('PAT017', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-02-08', 'POSITIVE'),
('PAT018', 'HIV_TEST_POSITIVE_CLIN', '2026-01-28', 'POSITIVE'),
('PAT019', 'HIV_TEST_NON_RAPID_QUANTITATIVE_OBSTYPE', '2026-02-12', 'POSITIVE'),
('PAT020', 'HIV_TEST_POSITIVE_CLIN', '2026-01-16', 'POSITIVE');

-- PAT021-PAT023: Have evidence but are suppressed (positive test)
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, qualitative_result) VALUES
('PAT021', 'HIV_TEST_POSITIVE_CLIN', '2026-01-10', 'POSITIVE'),
('PAT022', 'HIV_TEST_POSITIVE_CLIN', '2026-01-12', 'POSITIVE'),
('PAT023', 'HIV_TEST_POSITIVE_CLIN', '2026-01-14', 'POSITIVE');

-- PAT024-PAT025: Resurfacing scenarios - have positive test
INSERT INTO hcc_lab_result (patient_id, concept_alias, result_date, qualitative_result) VALUES
('PAT024', 'HIV_TEST_POSITIVE_CLIN', '2026-01-08', 'POSITIVE'),
('PAT025', 'HIV_TEST_POSITIVE_CLIN', '2026-01-11', 'POSITIVE');

-- ============================================================================
-- MEDICATION ORDERS
-- ============================================================================

-- PAT001-PAT005: Combination ART medication (HS criteria - highest weight)
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT001', 'BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED', '2026-01-20', 'COMBINATION'),
('PAT002', 'BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED', '2026-02-01', 'COMBINATION'),
('PAT003', 'DOLUTEGRAVIR_ABACAVIR_LAMIVUDINE_MED', '2026-01-15', 'COMBINATION'),
('PAT004', 'EFAVIRENZ_EMTRICITABINE_TENOFOVIR_MED', '2026-02-10', 'COMBINATION'),
('PAT005', 'BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED', '2026-01-25', 'COMBINATION');

-- PAT011-PAT015: Component ART medication (HS with positive test)
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT011', 'EMTRICITABINE_MED', '2026-02-01', 'COMPONENT'),
('PAT012', 'DOLUTEGRAVIR_MED', '2026-02-15', 'COMPONENT'),
('PAT013', 'ABACAVIR_MED', '2026-02-05', 'COMPONENT'),
('PAT014', 'RALTEGRAVIR_MED', '2026-02-20', 'COMPONENT'),
('PAT015', 'DARUNAVIR_MED', '2026-02-08', 'COMPONENT');

-- PAT016-PAT020: Low-specificity medications (MS criteria - Lamivudine or Tenofovir alone)
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT016', 'LAMIVUDINE_MED', '2026-02-01', 'COMPONENT'),
('PAT017', 'TENOFOVIR_MED', '2026-02-10', 'COMPONENT'),
('PAT018', 'LAMIVUDINE_MED', '2026-02-05', 'COMPONENT'),
('PAT019', 'TENOFOVIR_MED', '2026-02-15', 'COMPONENT'),
('PAT020', 'LAMIVUDINE_MED', '2026-02-08', 'COMPONENT');

-- PAT021-PAT023: Have ART med but are suppressed
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT021', 'BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED', '2026-01-20', 'COMBINATION'),
('PAT022', 'EMTRICITABINE_MED', '2026-01-25', 'COMPONENT'),
('PAT023', 'DOLUTEGRAVIR_ABACAVIR_LAMIVUDINE_MED', '2026-01-22', 'COMBINATION');

-- PAT024: Rejected previously, same med refill (should stay suppressed)
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT024', 'LAMIVUDINE_MED', '2026-02-15', 'COMPONENT');

-- PAT025: Rejected previously, DIFFERENT med now (should resurface)
INSERT INTO hcc_medication_order (patient_id, concept_alias, start_date, combination_type) VALUES
('PAT025', 'BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED', '2026-02-20', 'COMBINATION');

-- ============================================================================
-- DIAGNOSES (for suppression scenarios)
-- ============================================================================

-- PAT021-PAT023: Already have validated HCC 1 HIV/AIDS diagnosis (suppressed)
INSERT INTO hcc_diagnosis (patient_id, icd_code, hcc_category, model_type, suppression_status) VALUES
('PAT021', 'B20', 'HCC 1', 'CMS', 'Fully Validated'),
('PAT022', 'B20', 'HCC 1', 'CMS', 'Needs Administrative Attention'),
('PAT023', 'B20', 'HCC 1', 'HHS', 'Needs Clinical and Administrative Attention');

-- NOTE: Rejection states are inserted in V17 after the rule is created
