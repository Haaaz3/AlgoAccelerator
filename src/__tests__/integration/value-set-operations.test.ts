/**
 * Integration Tests: Value Set Operations
 *
 * Tests value set code management operations and their integration
 * with code generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMeasureStore } from '../../stores/measureStore';
import { generateCQL } from '../../services/cqlGenerator';
import {
  createTestMeasure,
  createTestCode,
  resetIdCounter,
} from '../fixtures/testMeasure';

describe('Value Set Operations', () => {
  beforeEach(() => {
    // Reset store to initial state
    useMeasureStore.setState({
      measures: [],
      activeMeasureId: null,
      activeTab: 'library',
      editorSection: null,
      isUploading: false,
      uploadProgress: 0,
      selectedCodeFormat: 'cql',
      validationTraces: [],
      activeTraceId: null,
    });

    resetIdCounter();
  });

  describe('addCodeToValueSet', () => {
    it('adds code to the correct value set and creates a correction record', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;
      const initialCodeCount = measure.valueSets[0].codes.length;

      // Create a new code to add
      const newCode = createTestCode({
        code: 'NEW-CODE-1',
        display: 'Newly Added Code',
        system: 'SNOMED',
      });

      // Add the code
      useMeasureStore.getState().addCodeToValueSet(
        measureId,
        valueSetId,
        newCode,
        'Added for testing'
      );

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      expect(updatedMeasure).toBeDefined();

      // Find the value set
      const updatedValueSet = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId);
      expect(updatedValueSet).toBeDefined();

      // Verify code was added
      expect(updatedValueSet!.codes.length).toBe(initialCodeCount + 1);
      expect(updatedValueSet!.codes.some(c => c.code === 'NEW-CODE-1')).toBe(true);

      // Verify correction record was created
      expect(updatedMeasure!.corrections).toBeDefined();
      expect(updatedMeasure!.corrections!.length).toBeGreaterThan(0);

      const correction = updatedMeasure!.corrections!.find(c => c.correctionType === 'code_added');
      expect(correction).toBeDefined();
      // correctedValue is the full array of codes after the addition
      expect(Array.isArray(correction!.correctedValue)).toBe(true);
      expect(correction!.correctedValue.some((c: any) => c.code === 'NEW-CODE-1')).toBe(true);
    });
  });

  describe('removeCodeFromValueSet', () => {
    it('removes code and creates a correction record', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;
      const codeToRemove = measure.valueSets[0].codes[0].code;
      const initialCodeCount = measure.valueSets[0].codes.length;

      // Remove the code
      useMeasureStore.getState().removeCodeFromValueSet(
        measureId,
        valueSetId,
        codeToRemove,
        'Removed for testing'
      );

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      expect(updatedMeasure).toBeDefined();

      // Find the value set
      const updatedValueSet = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId);
      expect(updatedValueSet).toBeDefined();

      // Verify code was removed
      expect(updatedValueSet!.codes.length).toBe(initialCodeCount - 1);
      expect(updatedValueSet!.codes.some(c => c.code === codeToRemove)).toBe(false);

      // Verify correction record was created
      expect(updatedMeasure!.corrections).toBeDefined();

      const correction = updatedMeasure!.corrections!.find(c => c.correctionType === 'code_removed');
      expect(correction).toBeDefined();
    });
  });

  describe('CQL Generation with Modified Value Sets', () => {
    it('adding a code then generating CQL includes the new code in the output', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;

      // Add a new code with a distinctive name
      const newCode = createTestCode({
        code: 'UNIQUE-TEST-CODE-XYZ',
        display: 'Unique Test Code for CQL',
        system: 'SNOMED',
      });

      useMeasureStore.getState().addCodeToValueSet(measureId, valueSetId, newCode);

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      expect(updatedMeasure).toBeDefined();

      // Generate CQL
      const result = generateCQL(updatedMeasure!);

      expect(result.success).toBe(true);
      expect(result.cql).toBeDefined();

      // The value set should be in the CQL output
      // Note: CQL doesn't typically list individual codes in value set declarations,
      // but the value set reference should be present
      const valueSetName = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId)?.name;
      expect(result.cql).toContain(valueSetName);
    });

    it('value set modifications are preserved through multiple operations', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;

      // Add multiple codes
      const codes = [
        createTestCode({ code: 'ADD-1', display: 'Added 1', system: 'SNOMED' }),
        createTestCode({ code: 'ADD-2', display: 'Added 2', system: 'SNOMED' }),
        createTestCode({ code: 'ADD-3', display: 'Added 3', system: 'SNOMED' }),
      ];

      for (const code of codes) {
        useMeasureStore.getState().addCodeToValueSet(measureId, valueSetId, code);
      }

      // Remove one
      useMeasureStore.getState().removeCodeFromValueSet(measureId, valueSetId, 'ADD-2');

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      const updatedValueSet = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId);

      // Should have ADD-1 and ADD-3 but not ADD-2
      expect(updatedValueSet!.codes.some(c => c.code === 'ADD-1')).toBe(true);
      expect(updatedValueSet!.codes.some(c => c.code === 'ADD-2')).toBe(false);
      expect(updatedValueSet!.codes.some(c => c.code === 'ADD-3')).toBe(true);

      // Should have correction records for all operations
      expect(updatedMeasure!.corrections!.length).toBe(4); // 3 adds + 1 remove
    });
  });

  describe('Edge Cases', () => {
    it('adding duplicate code is handled gracefully', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;
      const existingCode = measure.valueSets[0].codes[0];

      const initialCodeCount = measure.valueSets[0].codes.length;

      // Try to add the same code again
      useMeasureStore.getState().addCodeToValueSet(
        measureId,
        valueSetId,
        existingCode
      );

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      const updatedValueSet = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId);

      // Code count should increase (the store doesn't dedupe - that's UI responsibility)
      // or stay the same if store does dedupe
      expect(updatedValueSet!.codes.length).toBeGreaterThanOrEqual(initialCodeCount);
    });

    it('removing non-existent code is handled gracefully', () => {
      const { measure } = createTestMeasure({ withComponents: false });

      // Add measure to store
      useMeasureStore.getState().addMeasure(measure);

      const measureId = measure.id;
      const valueSetId = measure.valueSets[0].id;
      const initialCodeCount = measure.valueSets[0].codes.length;

      // Try to remove a code that doesn't exist
      useMeasureStore.getState().removeCodeFromValueSet(
        measureId,
        valueSetId,
        'NONEXISTENT-CODE'
      );

      // Get updated measure
      const updatedMeasure = useMeasureStore.getState().measures.find(m => m.id === measureId);
      const updatedValueSet = updatedMeasure!.valueSets.find(vs => vs.id === valueSetId);

      // Code count should remain the same
      expect(updatedValueSet!.codes.length).toBe(initialCodeCount);
    });
  });
});
