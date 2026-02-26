/**
 * Feedback Store
 *
 * Captures and persists user corrections to LLM-extracted measure data.
 * This is the foundation for extraction quality analytics and future prompt improvement.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Classification Helpers
// ============================================================================

/**
 * Auto-classify the correction pattern based on field path
 */
function classifyCorrectionPattern(fieldPath, _originalValue, _correctedValue) {
  if (fieldPath.includes('resourceType')) return 'resource_type_misclassification';
  if (fieldPath.includes('valueSet.oid') || fieldPath.includes('valueSet.name')) return 'value_set_error';
  if (fieldPath.includes('timing')) return 'timing_interpretation_error';
  if (fieldPath.includes('negation')) return 'negation_logic_error';
  if (fieldPath.includes('operator') || fieldPath.includes('logical')) return 'logical_operator_error';
  if (fieldPath.includes('gender') || fieldPath.includes('age')) return 'demographic_constraint_error';
  if (fieldPath.includes('code') || fieldPath.includes('system')) return 'code_system_error';
  if (fieldPath.includes('name') || fieldPath.includes('title') || fieldPath.includes('description')) return 'naming_error';
  return 'other';
}

/**
 * Classify the severity of a correction
 */
function classifySeverity(fieldPath) {
  // High: changes that affect generated code
  if (['resourceType', 'valueSet', 'timing', 'negation', 'operator', 'logical'].some(k => fieldPath.includes(k))) {
    return 'high';
  }
  // Medium: changes that affect metadata but not code
  if (['gender', 'age', 'code', 'system'].some(k => fieldPath.includes(k))) {
    return 'medium';
  }
  // Low: cosmetic/naming changes
  return 'low';
}

/**
 * Get a human-readable label for a field path
 */
function getFieldLabel(fieldPath) {
  const labels = {
    resourceType: 'Resource Type',
    'valueSet.oid': 'Value Set OID',
    'valueSet.name': 'Value Set Name',
    'valueSet.codes': 'Value Set Codes',
    'timing.operator': 'Timing Operator',
    'timing.quantity': 'Timing Duration',
    'timing.unit': 'Timing Unit',
    negation: 'Negation',
    operator: 'Logical Operator',
    gender: 'Gender Constraint',
    age: 'Age Constraint',
    name: 'Name',
    title: 'Title',
    description: 'Description',
  };

  // Check for partial matches
  for (const [key, label] of Object.entries(labels)) {
    if (fieldPath.includes(key)) return label;
  }

  return fieldPath.split('.').pop() || 'Unknown Field';
}

/**
 * Generate a unique correction ID
 */
function generateCorrectionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `corr-${timestamp}-${random}`;
}

// ============================================================================
// Store Definition
// ============================================================================

export const useFeedbackStore = create()(
  persist(
    (set, get) => ({
      // Core correction data
      corrections: [],

      // Configuration
      feedbackEnabled: true,
      autoClassify: true,

      // Version for future migrations
      version: 1,

      // ======================================================================
      // Actions
      // ======================================================================

      /**
       * Record a correction when user edits an extraction-populated field
       */
      recordCorrection: (correctionData) => {
        const state = get();
        if (!state.feedbackEnabled) return null;

        try {
          const fieldPath = correctionData.fieldPath || '';
          const correction = {
            id: generateCorrectionId(),
            measureId: correctionData.measureId,
            measureTitle: correctionData.measureTitle || 'Unknown Measure',
            catalogueType: correctionData.catalogueType || 'unknown',
            extractionTimestamp: correctionData.extractionTimestamp || null,
            correctionTimestamp: new Date().toISOString(),
            fieldPath,
            fieldLabel: correctionData.fieldLabel || getFieldLabel(fieldPath),
            originalValue: correctionData.originalValue,
            correctedValue: correctionData.correctedValue,
            dataElementName: correctionData.dataElementName || '',
            populationName: correctionData.populationName || '',
            userNote: correctionData.userNote || '',
            correctionPattern: state.autoClassify
              ? classifyCorrectionPattern(fieldPath, correctionData.originalValue, correctionData.correctedValue)
              : 'unclassified',
            severity: classifySeverity(fieldPath),
          };

          set((state) => ({
            corrections: [correction, ...state.corrections],
          }));

          return correction.id;
        } catch (error) {
          console.error('[feedbackStore] Failed to record correction:', error);
          return null;
        }
      },

      /**
       * Bulk import corrections (for migration from existing data)
       */
      importCorrections: (corrections) => {
        if (!Array.isArray(corrections)) return;

        const validCorrections = corrections
          .filter(c => c && c.measureId && c.fieldPath)
          .map(c => ({
            ...c,
            id: c.id || generateCorrectionId(),
            correctionTimestamp: c.correctionTimestamp || new Date().toISOString(),
            correctionPattern: c.correctionPattern || classifyCorrectionPattern(c.fieldPath, c.originalValue, c.correctedValue),
            severity: c.severity || classifySeverity(c.fieldPath),
          }));

        set((state) => ({
          corrections: [...validCorrections, ...state.corrections],
        }));
      },

      /**
       * Delete a single correction
       */
      deleteCorrection: (correctionId) => {
        set((state) => ({
          corrections: state.corrections.filter(c => c.id !== correctionId),
        }));
      },

      /**
       * Clear all corrections for a measure
       */
      clearMeasureCorrections: (measureId) => {
        set((state) => ({
          corrections: state.corrections.filter(c => c.measureId !== measureId),
        }));
      },

      /**
       * Clear all corrections
       */
      clearAllCorrections: () => {
        set({ corrections: [] });
      },

      /**
       * Toggle feedback capture
       */
      setFeedbackEnabled: (enabled) => {
        set({ feedbackEnabled: enabled });
      },

      /**
       * Get corrections filtered by criteria
       */
      getFilteredCorrections: (filters = {}) => {
        const { corrections } = get();
        const { catalogueType, measureId, pattern, severity, dateRange, searchText } = filters;

        return corrections.filter(c => {
          if (catalogueType && catalogueType !== 'all' && c.catalogueType !== catalogueType) return false;
          if (measureId && c.measureId !== measureId) return false;
          if (pattern && pattern !== 'all' && c.correctionPattern !== pattern) return false;
          if (severity && severity !== 'all' && c.severity !== severity) return false;
          if (dateRange) {
            const correctionDate = new Date(c.correctionTimestamp);
            if (dateRange.start && correctionDate < new Date(dateRange.start)) return false;
            if (dateRange.end && correctionDate > new Date(dateRange.end)) return false;
          }
          if (searchText) {
            const search = searchText.toLowerCase();
            const matchesSearch =
              (c.measureTitle || '').toLowerCase().includes(search) ||
              (c.dataElementName || '').toLowerCase().includes(search) ||
              (c.fieldLabel || '').toLowerCase().includes(search);
            if (!matchesSearch) return false;
          }
          return true;
        });
      },

      /**
       * Get aggregated pattern stats
       */
      getPatternStats: (catalogueType = null) => {
        const { corrections } = get();
        const filtered = catalogueType && catalogueType !== 'all'
          ? corrections.filter(c => c.catalogueType === catalogueType)
          : corrections;

        const patternMap = {};

        for (const c of filtered) {
          const pattern = c.correctionPattern || 'other';
          if (!patternMap[pattern]) {
            patternMap[pattern] = {
              pattern,
              count: 0,
              lastSeen: null,
              examples: [],
            };
          }
          patternMap[pattern].count++;
          if (!patternMap[pattern].lastSeen || c.correctionTimestamp > patternMap[pattern].lastSeen) {
            patternMap[pattern].lastSeen = c.correctionTimestamp;
          }
          if (patternMap[pattern].examples.length < 3) {
            patternMap[pattern].examples.push({
              measureTitle: c.measureTitle,
              originalValue: c.originalValue,
              correctedValue: c.correctedValue,
            });
          }
        }

        return Object.values(patternMap).sort((a, b) => b.count - a.count);
      },

      /**
       * Get accuracy metrics
       */
      getAccuracyMetrics: (catalogueType = null) => {
        const { corrections } = get();
        const filtered = catalogueType && catalogueType !== 'all'
          ? corrections.filter(c => c.catalogueType === catalogueType)
          : corrections;

        // Count unique measures
        const measureIds = new Set(filtered.map(c => c.measureId));
        const totalMeasures = measureIds.size;
        const totalCorrections = filtered.length;
        const avgCorrectionsPerMeasure = totalMeasures > 0 ? totalCorrections / totalMeasures : 0;

        // Corrections by field
        const correctionsByField = {};
        for (const c of filtered) {
          const fieldLabel = c.fieldLabel || 'Unknown';
          correctionsByField[fieldLabel] = (correctionsByField[fieldLabel] || 0) + 1;
        }

        // Trend data by month
        const trendMap = {};
        for (const c of filtered) {
          const date = new Date(c.correctionTimestamp);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          trendMap[month] = (trendMap[month] || 0) + 1;
        }
        const trendData = Object.entries(trendMap)
          .map(([month, corrections]) => ({ month, corrections }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Severity breakdown
        const severityBreakdown = {
          high: filtered.filter(c => c.severity === 'high').length,
          medium: filtered.filter(c => c.severity === 'medium').length,
          low: filtered.filter(c => c.severity === 'low').length,
        };

        return {
          totalMeasures,
          totalCorrections,
          avgCorrectionsPerMeasure: Math.round(avgCorrectionsPerMeasure * 10) / 10,
          correctionsByField,
          trendData,
          severityBreakdown,
        };
      },

      /**
       * Export corrections as JSON
       */
      exportCorrections: (filters = {}) => {
        const state = get();
        const corrections = state.getFilteredCorrections(filters);

        return {
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
          totalCount: corrections.length,
          filters,
          corrections,
        };
      },

      /**
       * Get top correction pattern
       */
      getTopPattern: () => {
        const stats = get().getPatternStats();
        return stats.length > 0 ? stats[0] : null;
      },
    }),
    {
      name: 'feedback-storage',
      version: 1,
      partialize: (state) => ({
        corrections: state.corrections,
        feedbackEnabled: state.feedbackEnabled,
        autoClassify: state.autoClassify,
      }),
    }
  )
);

// Export classification helpers for use in other modules
export { classifyCorrectionPattern, classifySeverity, getFieldLabel };
