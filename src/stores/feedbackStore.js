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
  // Component-level corrections (highest priority)
  if (fieldPath.includes('DELETED')) return 'component_hallucination';
  if (fieldPath.includes('ADDED')) return 'component_missing';
  // Field-level corrections
  if (fieldPath.includes('resourceType')) return 'resource_type_misclassification';
  if (fieldPath.includes('valueSet.oid') || fieldPath.includes('valueSet.name')) return 'value_set_error';
  if (fieldPath.includes('valueSet.codes')) return 'code_system_error';
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
  // High: component-level changes (additions/deletions) affect generated code directly
  if (fieldPath.includes('DELETED') || fieldPath.includes('ADDED')) {
    return 'high';
  }
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
    DELETED: 'Component Deleted',
    ADDED: 'Component Added',
    resourceType: 'Resource Type',
    'valueSet.oid': 'Value Set OID',
    'valueSet.name': 'Value Set Name',
    'valueSet.codes': 'Value Set Codes',
    'timing.operator': 'Timing Operator',
    'timing.quantity': 'Timing Duration',
    'timing.unit': 'Timing Unit',
    timing: 'Timing',
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
      feedbackInjectionEnabled: true,
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
       * Toggle feedback injection into extraction prompts
       */
      setFeedbackInjectionEnabled: (enabled) => {
        set({ feedbackInjectionEnabled: enabled });
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

      /**
       * Generate extraction guidance from past corrections.
       * This is injected into LLM prompts to avoid repeating mistakes.
       *
       * @param {string} catalogueType - e.g., 'ecqm', 'hedis', 'cms_core'
       * @returns {string} Formatted guidance text to inject into prompt
       */
      generateExtractionGuidance: (catalogueType) => {
        const state = get();
        if (!state.feedbackInjectionEnabled) return '';

        const corrections = state.corrections || [];
        if (corrections.length === 0) return '';

        // Filter to relevant corrections and prioritize
        // Currently includes all corrections; cross-catalogue patterns are valuable
        const relevant = prioritizeCorrections(corrections, catalogueType, 15);

        if (relevant.length === 0) return '';

        // Group by pattern
        const patterns = {};
        for (const c of relevant) {
          const pattern = c.correctionPattern || 'other';
          if (!patterns[pattern]) patterns[pattern] = [];
          patterns[pattern].push(c);
        }

        // Build guidance sections
        const sections = [];

        // Hallucinated components (high value — LLM invented things that don't exist)
        if (patterns.component_hallucination?.length > 0) {
          const examples = patterns.component_hallucination.slice(0, 5);
          sections.push(
            `IMPORTANT - DO NOT HALLUCINATE COMPONENTS: In previous extractions, the following components were incorrectly included and had to be removed by reviewers:\n` +
            examples.map(c => `  - "${c.originalValue?.name || c.dataElementName}" was hallucinated in ${c.measureTitle || 'a measure'}`).join('\n') +
            `\nOnly include components that are EXPLICITLY stated in the measure specification. If you are uncertain whether a component belongs, do NOT include it.`
          );
        }

        // Missing components (high value — LLM missed things that should be there)
        if (patterns.component_missing?.length > 0) {
          const examples = patterns.component_missing.slice(0, 5);
          sections.push(
            `IMPORTANT - DO NOT MISS COMPONENTS: In previous extractions, the following types of components were missed and had to be manually added by reviewers:\n` +
            examples.map(c => `  - "${c.correctedValue?.name || c.dataElementName}" was missing from ${c.measureTitle || 'a measure'}`).join('\n') +
            `\nCarefully check for ALL components mentioned in the specification, including edge cases and exclusion criteria.`
          );
        }

        // Value set errors
        if (patterns.value_set_error?.length > 0) {
          const examples = patterns.value_set_error.slice(0, 3);
          sections.push(
            `VALUE SET ACCURACY: Previous extractions had incorrect value set assignments:\n` +
            examples.map(c => `  - "${c.dataElementName}": was "${c.originalValue}" but should be "${c.correctedValue}"`).join('\n') +
            `\nDouble-check all value set OIDs and names against the specification.`
          );
        }

        // Naming errors / description inaccuracies
        if (patterns.naming_error?.length > 0) {
          sections.push(
            `DESCRIPTION ACCURACY: ${patterns.naming_error.length} descriptions were corrected in previous extractions. Use precise language from the measure specification rather than paraphrasing.`
          );
        }

        // Timing errors
        if (patterns.timing_interpretation_error?.length > 0) {
          const examples = patterns.timing_interpretation_error.slice(0, 3);
          sections.push(
            `TIMING ACCURACY: Previous extractions had timing errors:\n` +
            examples.map(c => `  - "${c.dataElementName}": timing was "${JSON.stringify(c.originalValue)}" but should be "${JSON.stringify(c.correctedValue)}"`).join('\n') +
            `\nPay close attention to measurement period references, "prior to", "during", and specific month counts.`
          );
        }

        // Resource type errors
        if (patterns.resource_type_misclassification?.length > 0) {
          sections.push(
            `DATA TYPE ACCURACY: ${patterns.resource_type_misclassification.length} resource/data types were corrected. Ensure you use the correct FHIR resource type for each data element (e.g., Condition vs Observation vs Procedure).`
          );
        }

        // Logical operator errors
        if (patterns.logical_operator_error?.length > 0) {
          sections.push(
            `LOGICAL OPERATORS: ${patterns.logical_operator_error.length} logical operator errors were corrected. Pay attention to AND vs OR vs NOT relationships between criteria.`
          );
        }

        if (sections.length === 0) return '';

        // Assemble final guidance block (limit to ~2000 chars)
        const header = `\n\n--- EXTRACTION QUALITY GUIDANCE (based on ${relevant.length} corrections from previous extractions) ---\n`;
        const footer = `\n--- END EXTRACTION GUIDANCE ---\n`;
        let guidance = header + sections.join('\n\n') + footer;

        // Truncate if too long
        if (guidance.length > 2000) {
          guidance = guidance.substring(0, 1950) + '\n[... truncated for brevity ...]\n' + footer;
        }

        console.log('[feedback] Injection guidance:', {
          catalogueType,
          correctionsCount: relevant.length,
          guidanceLength: guidance.length,
          patterns: Object.keys(patterns),
        });

        return guidance;
      },
    }),
    {
      name: 'feedback-storage',
      version: 1,
      partialize: (state) => ({
        corrections: state.corrections,
        feedbackEnabled: state.feedbackEnabled,
        feedbackInjectionEnabled: state.feedbackInjectionEnabled,
        autoClassify: state.autoClassify,
      }),
    }
  )
);

/**
 * Prioritize corrections for guidance injection
 */
function prioritizeCorrections(corrections, catalogueType, maxCount = 15) {
  return corrections
    .sort((a, b) => {
      // Same catalogue type first
      if (catalogueType) {
        const aMatch = a.catalogueType === catalogueType ? 0 : 1;
        const bMatch = b.catalogueType === catalogueType ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      // High severity first
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const aSev = severityOrder[a.severity] ?? 1;
      const bSev = severityOrder[b.severity] ?? 1;
      if (aSev !== bSev) return aSev - bSev;
      // Recent first
      return new Date(b.correctionTimestamp) - new Date(a.correctionTimestamp);
    })
    .slice(0, maxCount);
}

// Export classification helpers for use in other modules
export { classifyCorrectionPattern, classifySeverity, getFieldLabel };
