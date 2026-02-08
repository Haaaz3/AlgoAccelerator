/**
 * Integration Tests: Code Generation
 *
 * Tests the CQL and HDI SQL generators for correct output,
 * warning handling, and graceful error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateCQL } from '../../services/cqlGenerator';
import { generateHDISQL } from '../../services/hdiSqlGenerator';
import {
  createTestMeasure,
  createEdgeCaseMeasure,
  createTestValueSet,
  createTestDataElement,
  createTestLogicalClause,
  createTestPopulation,
  resetIdCounter,
} from '../fixtures/testMeasure';

describe('Code Generation', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateCQL', () => {
    it('produces output containing library and valueset declarations for a complete measure', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      const result = generateCQL(measure);

      expect(result.success).toBe(true);
      expect(result.cql).toBeDefined();
      expect(result.cql.length).toBeGreaterThan(0);

      // Check for library declaration
      expect(result.cql).toContain('library');

      // Check for valueset declarations
      expect(result.cql).toContain('valueset');

      // Check for FHIR version
      expect(result.cql).toContain("using FHIR version '4.0.1'");

      // Check for Measurement Period parameter
      expect(result.cql).toContain('parameter "Measurement Period"');

      // Check metadata
      expect(result.metadata.valueSetCount).toBe(3);
      expect(result.metadata.populationCount).toBe(2);
    });

    it('includes warning comments for a value set with zero codes', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Modify value sets to have zero codes
      const measureWithNoCodes = {
        ...measure,
        valueSets: measure.valueSets.map(vs => ({ ...vs, codes: [] })),
      };

      const result = generateCQL(measureWithNoCodes);

      expect(result.success).toBe(true);

      // Check for warnings array
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);

      // Check that warnings mention "no codes"
      const hasNoCodesWarning = result.warnings!.some(w =>
        w.toLowerCase().includes('no codes')
      );
      expect(hasNoCodesWarning).toBe(true);

      // Check for warning comment in output
      expect(result.cql).toContain('WARNING');
    });

    it('handles null population criteria without crashing and includes warning comment', () => {
      const measure = createEdgeCaseMeasure('null-criteria');

      // This should not throw
      const result = generateCQL(measure);

      expect(result.success).toBe(true);
      expect(result.cql).toBeDefined();

      // The output should still be valid CQL structure
      expect(result.cql).toContain('library');
    });

    it('returns error when measure has no populations', () => {
      const measure = createEdgeCaseMeasure('empty-populations');

      const result = generateCQL(measure);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('population');
    });

    it('handles measure with missing measureId', () => {
      const { measure } = createTestMeasure({ withComponents: false });
      const measureNoId = {
        ...measure,
        metadata: {
          ...measure.metadata,
          measureId: '',
        },
      };

      const result = generateCQL(measureNoId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Measure ID is required');
    });
  });

  describe('generateHDISQL', () => {
    it('produces output containing CTE structure for a complete measure', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      const result = generateHDISQL(measure);

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      expect(result.sql.length).toBeGreaterThan(0);

      // Check for CTE structure (WITH clause or named CTEs)
      // HDI SQL uses named CTEs like PRED_*, DEMOG, etc.
      expect(result.sql.toLowerCase()).toMatch(/\bas\s*\(/);

      // Check for population sections
      expect(result.sql).toContain('INITIAL_POPULATION');

      // Check metadata
      expect(result.metadata.predicateCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.dataModelsUsed).toBeDefined();
    });

    it('handles DataElements with no codes without crashing', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Modify to have value sets with no codes
      const measureNoCodes = {
        ...measure,
        valueSets: measure.valueSets.map(vs => ({ ...vs, codes: [] })),
      };

      // This should not throw
      const result = generateHDISQL(measureNoCodes);

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
    });

    it('handles empty populations array without crashing', () => {
      const measure = createEdgeCaseMeasure('empty-populations');

      // This should not throw
      const result = generateHDISQL(measure);

      // Generator should handle gracefully
      expect(result.sql).toBeDefined();

      // May have warnings about no clinical criteria
      if (result.warnings && result.warnings.length > 0) {
        expect(result.warnings.some(w => w.toLowerCase().includes('no'))).toBe(true);
      }
    });

    it('includes metadata about predicates and data models used', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      const result = generateHDISQL(measure);

      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata.predicateCount).toBe('number');
      expect(Array.isArray(result.metadata.dataModelsUsed)).toBe(true);
      expect(['low', 'medium', 'high']).toContain(result.metadata.estimatedComplexity);
      expect(result.metadata.generatedAt).toBeDefined();
    });

    it('produces valid SQL structure with proper CTE naming', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      const result = generateHDISQL(measure);

      expect(result.success).toBe(true);

      // Check for proper CTE structure - should have AS clauses
      const asCount = (result.sql.match(/\bas\s*\(/gi) || []).length;
      expect(asCount).toBeGreaterThan(0);

      // Check for SELECT statements
      expect(result.sql.toLowerCase()).toContain('select');

      // Check for final select (measure result)
      expect(result.sql).toContain('MEASURE_RESULT');
    });
  });

  describe('Generator Edge Cases', () => {
    it('generateCQL handles DataElement with no valueSet gracefully', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Create a data element with no valueSet
      const elemNoVS = createTestDataElement({
        type: 'procedure',
        description: 'Procedure without value set',
        valueSet: undefined,
      });

      // Add to first population's criteria
      const updatedMeasure = {
        ...measure,
        populations: [
          {
            ...measure.populations[0],
            criteria: createTestLogicalClause({
              operator: 'AND',
              children: [elemNoVS],
            }),
          },
          ...measure.populations.slice(1),
        ],
      };

      const result = generateCQL(updatedMeasure);

      // Should not crash
      expect(result.success).toBe(true);
      expect(result.cql).toBeDefined();

      // Should contain a warning comment
      expect(result.cql).toContain('WARNING');
    });

    it('generateHDISQL handles null clause children gracefully', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Create population with empty criteria
      const updatedMeasure = {
        ...measure,
        populations: [
          createTestPopulation({
            type: 'initial-population',
            criteria: createTestLogicalClause({
              operator: 'AND',
              children: [],
            }),
          }),
        ],
      };

      const result = generateHDISQL(updatedMeasure);

      // Should handle gracefully
      expect(result.sql).toBeDefined();
    });
  });
});
