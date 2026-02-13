package com.algoaccel.service;

import com.algoaccel.model.enums.DataElementType;
import com.algoaccel.model.enums.LogicalOperator;
import com.algoaccel.model.measure.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service for generating HDI (HealtheIntent) SQL from measures.
 * Produces CTE-based SQL compatible with Cerner HealtheIntent data warehouse.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HdiSqlGeneratorService {

    private final HdiSqlTemplateService templateService;

    /**
     * Generate complete SQL for a measure.
     */
    public String generateSql(Measure measure) {
        StringBuilder sql = new StringBuilder();

        // Header comment
        sql.append("-- ============================================================\n");
        sql.append("-- HDI SQL for: ").append(measure.getTitle()).append("\n");
        if (measure.getMeasureId() != null) {
            sql.append("-- Measure ID: ").append(measure.getMeasureId()).append("\n");
        }
        sql.append("-- Generated: ").append(java.time.LocalDateTime.now()).append("\n");
        sql.append("-- ============================================================\n\n");

        // Base CTEs
        sql.append(templateService.getOntCte()).append("\n\n");
        sql.append(templateService.getDemogCte()).append("\n\n");

        // Collect predicates from all populations
        Set<String> addedPredicates = new HashSet<>();
        List<String> predicateCtes = new ArrayList<>();

        for (Population population : measure.getPopulations()) {
            if (population.getRootClause() != null) {
                collectPredicates(population.getRootClause(), predicateCtes, addedPredicates);
            }
        }

        // Add unique predicate CTEs
        for (String cte : predicateCtes) {
            sql.append(cte).append("\n\n");
        }

        // Generate population CTEs
        List<String> populationCteSql = new ArrayList<>();
        for (Population population : measure.getPopulations()) {
            String popCte = generatePopulationCte(population);
            if (popCte != null && !popCte.isEmpty()) {
                populationCteSql.add(popCte);
            }
        }

        sql.append("-- Population CTEs\n");
        for (String popCte : populationCteSql) {
            sql.append(popCte).append("\n\n");
        }

        // Final SELECT combining populations
        sql.append(generateFinalSelect(measure));

        return sql.toString();
    }

    /**
     * Collect predicate CTEs from a clause tree.
     */
    private void collectPredicates(LogicalClause clause, List<String> predicates, Set<String> added) {
        // Process data elements
        for (DataElement element : clause.getDataElements()) {
            String predicateName = getPredicateName(element);
            if (!added.contains(predicateName)) {
                String cte = generatePredicateCte(element);
                if (cte != null) {
                    predicates.add(cte);
                    added.add(predicateName);
                }
            }
        }

        // Recurse into child clauses
        for (LogicalClause child : clause.getChildClauses()) {
            collectPredicates(child, predicates, added);
        }
    }

    /**
     * Get a unique predicate name for a data element.
     */
    private String getPredicateName(DataElement element) {
        String desc = element.getDescription();
        if (desc == null) {
            return "pred_" + element.getId();
        }
        // Convert to snake_case identifier
        return "pred_" + desc.toLowerCase()
            .replaceAll("[^a-z0-9]+", "_")
            .replaceAll("^_|_$", "")
            .substring(0, Math.min(desc.length(), 50));
    }

    /**
     * Generate a predicate CTE for a data element.
     */
    private String generatePredicateCte(DataElement element) {
        DataElementType type = element.getElementType();
        if (type == null) {
            return null;
        }

        String predicateName = getPredicateName(element);

        switch (type) {
            case DEMOGRAPHIC:
                return templateService.getDemographicsPredicate(predicateName, element.getDescription());
            case DIAGNOSIS:
                return templateService.getConditionPredicate(predicateName, element.getDescription(), getValueSetOid(element));
            case OBSERVATION:
                return templateService.getResultPredicate(predicateName, element.getDescription(), getValueSetOid(element));
            case PROCEDURE:
                return templateService.getProcedurePredicate(predicateName, element.getDescription(), getValueSetOid(element));
            case MEDICATION:
                return templateService.getMedicationPredicate(predicateName, element.getDescription(), getValueSetOid(element));
            case IMMUNIZATION:
                return templateService.getImmunizationPredicate(predicateName, element.getDescription(), getValueSetOid(element));
            case ENCOUNTER:
                return templateService.getEncounterPredicate(predicateName, element.getDescription(), getValueSetOid(element));
            default:
                return null;
        }
    }

    /**
     * Get value set OID from element if available.
     */
    private String getValueSetOid(DataElement element) {
        if (element.getValueSets() != null && !element.getValueSets().isEmpty()) {
            MeasureValueSet vs = element.getValueSets().iterator().next();
            return vs.getOid();
        }
        return null;
    }

    /**
     * Generate a population CTE.
     */
    private String generatePopulationCte(Population population) {
        if (population.getRootClause() == null) {
            return null;
        }

        String popName = getPopulationCteName(population);

        StringBuilder sql = new StringBuilder();
        sql.append(popName).append(" AS (\n");
        sql.append("  SELECT DISTINCT d.person_id\n");
        sql.append("  FROM demog d\n");

        // Generate JOINs based on clause structure
        List<String> joins = generateClauseJoins(population.getRootClause(), "d");
        for (String join : joins) {
            sql.append("  ").append(join).append("\n");
        }

        sql.append(")");

        return sql.toString();
    }

    /**
     * Get CTE name for a population.
     */
    private String getPopulationCteName(Population population) {
        if (population.getPopulationType() == null) {
            return "population_" + population.getId();
        }
        return population.getPopulationType().name().toLowerCase();
    }

    /**
     * Generate JOIN clauses for a logical clause.
     */
    private List<String> generateClauseJoins(LogicalClause clause, String baseAlias) {
        List<String> joins = new ArrayList<>();
        LogicalOperator op = clause.getOperator();

        for (DataElement element : clause.getDataElements()) {
            String predicateName = getPredicateName(element);
            String joinType = element.isNegation() ? "LEFT" : "INNER";

            if (op == LogicalOperator.OR) {
                joinType = "LEFT";
            }

            joins.add(String.format("%s JOIN %s ON %s.person_id = %s.person_id",
                joinType, predicateName, baseAlias, predicateName));
        }

        // Recurse for child clauses
        for (LogicalClause child : clause.getChildClauses()) {
            joins.addAll(generateClauseJoins(child, baseAlias));
        }

        return joins;
    }

    /**
     * Generate the final SELECT statement.
     */
    private String generateFinalSelect(Measure measure) {
        StringBuilder sql = new StringBuilder();
        sql.append("-- Final Result Set\n");
        sql.append("SELECT\n");
        sql.append("  d.person_id,\n");
        sql.append("  d.birth_date,\n");
        sql.append("  d.gender,\n");

        // Add population flags
        List<String> popNames = new ArrayList<>();
        for (Population pop : measure.getPopulations()) {
            String popName = getPopulationCteName(pop);
            popNames.add(popName);
            sql.append("  CASE WHEN ").append(popName).append(".person_id IS NOT NULL THEN 1 ELSE 0 END AS in_")
               .append(popName).append(",\n");
        }

        // Remove trailing comma
        sql.setLength(sql.length() - 2);
        sql.append("\n");

        sql.append("FROM demog d\n");

        // LEFT JOIN all population CTEs
        for (String popName : popNames) {
            sql.append("LEFT JOIN ").append(popName).append(" ON d.person_id = ").append(popName).append(".person_id\n");
        }

        sql.append("WHERE 1=1\n");

        // Add global constraints if present
        GlobalConstraints gc = measure.getGlobalConstraints();
        if (gc != null) {
            if (gc.getAgeMin() != null) {
                sql.append("  AND DATEDIFF(YEAR, d.birth_date, CURRENT_DATE) >= ").append(gc.getAgeMin()).append("\n");
            }
            if (gc.getAgeMax() != null) {
                sql.append("  AND DATEDIFF(YEAR, d.birth_date, CURRENT_DATE) <= ").append(gc.getAgeMax()).append("\n");
            }
            if (gc.getGender() != null) {
                sql.append("  AND d.gender = '").append(gc.getGender().name().substring(0, 1)).append("'\n");
            }
        }

        sql.append(";");

        return sql.toString();
    }
}
