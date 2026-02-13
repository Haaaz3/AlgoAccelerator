package com.algoaccel.service;

import org.springframework.stereotype.Service;

/**
 * Service providing SQL templates for HDI (HealtheIntent) data warehouse.
 * Contains CTE templates for various clinical data types.
 */
@Service
public class HdiSqlTemplateService {

    /**
     * Get the ONT (ontology) base CTE.
     */
    public String getOntCte() {
        return """
            WITH ont AS (
              SELECT
                concept_cki,
                source_vocabulary_cd,
                source_concept_identifier,
                source_concept_display
              FROM ontology.concept
              WHERE source_vocabulary_cd IN ('ICD-10-CM', 'SNOMED', 'CPT', 'LOINC', 'RXNORM', 'CVX')
            )""";
    }

    /**
     * Get the DEMOG (demographics) base CTE.
     */
    public String getDemogCte() {
        return """
            , demog AS (
              SELECT
                p.person_id,
                p.birth_date,
                CASE p.sex_cd
                  WHEN 'M' THEN 'male'
                  WHEN 'F' THEN 'female'
                  ELSE 'unknown'
                END AS gender,
                p.race_cd,
                p.ethnicity_cd,
                p.death_date
              FROM hsp.patient p
              WHERE p.active_ind = 1
            )""";
    }

    /**
     * Generate a demographics predicate CTE.
     */
    public String getDemographicsPredicate(String name, String description) {
        // Handle age predicates
        if (description != null && description.toLowerCase().contains("age")) {
            return String.format("""
                , %s AS (
                  SELECT person_id
                  FROM demog
                  -- %s
                )""", name, description);
        }

        // Handle gender predicates
        if (description != null && (description.toLowerCase().contains("female") || description.toLowerCase().contains("male"))) {
            String gender = description.toLowerCase().contains("female") ? "female" : "male";
            return String.format("""
                , %s AS (
                  SELECT person_id
                  FROM demog
                  WHERE gender = '%s'
                )""", name, gender);
        }

        return String.format("""
            , %s AS (
              SELECT person_id
              FROM demog
              -- %s
            )""", name, description != null ? description : "demographics predicate");
    }

    /**
     * Generate a condition/diagnosis predicate CTE.
     */
    public String getConditionPredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT cd.person_id
              FROM hsp.clinical_diagnosis cd
              INNER JOIN ont o ON cd.diagnosis_cki = o.concept_cki
              WHERE o.source_vocabulary_cd IN ('ICD-10-CM', 'SNOMED')
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "condition predicate");
    }

    /**
     * Generate a result/observation predicate CTE.
     */
    public String getResultPredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT cr.person_id
              FROM hsp.clinical_result cr
              INNER JOIN ont o ON cr.result_cki = o.concept_cki
              WHERE cr.result_status_cd = 'FINAL'
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "observation predicate");
    }

    /**
     * Generate a procedure predicate CTE.
     */
    public String getProcedurePredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT cp.person_id
              FROM hsp.clinical_procedure cp
              INNER JOIN ont o ON cp.procedure_cki = o.concept_cki
              WHERE o.source_vocabulary_cd IN ('CPT', 'HCPCS', 'SNOMED')
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "procedure predicate");
    }

    /**
     * Generate a medication predicate CTE.
     */
    public String getMedicationPredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT ma.person_id
              FROM hsp.medication_administration ma
              INNER JOIN ont o ON ma.medication_cki = o.concept_cki
              WHERE ma.admin_status_cd = 'COMPLETED'
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "medication predicate");
    }

    /**
     * Generate an immunization predicate CTE.
     */
    public String getImmunizationPredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT i.person_id
              FROM hsp.immunization i
              INNER JOIN ont o ON i.immunization_cki = o.concept_cki
              WHERE i.immunization_status_cd = 'COMPLETED'
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "immunization predicate");
    }

    /**
     * Generate an encounter predicate CTE.
     */
    public String getEncounterPredicate(String name, String description, String valueSetOid) {
        String vsClause = valueSetOid != null
            ? String.format("AND o.source_concept_identifier IN (SELECT code FROM value_set WHERE oid = '%s')", valueSetOid)
            : "-- value set codes to be added";

        return String.format("""
            , %s AS (
              SELECT DISTINCT e.person_id
              FROM hsp.encounter e
              LEFT JOIN ont o ON e.encounter_type_cki = o.concept_cki
              WHERE e.encounter_status_cd = 'COMPLETED'
              %s
              -- %s
            )""", name, vsClause, description != null ? description : "encounter predicate");
    }
}
