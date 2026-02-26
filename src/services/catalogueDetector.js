/**
 * Catalogue Detector
 *
 * Classifies clinical quality measures into catalogue types based on
 * their title, description, metadata, and measure ID patterns.
 */

/**
 * Catalogue types supported by the system
 */
export const CATALOGUE_TYPES = {
  ECQM: 'ecqm',
  HEDIS: 'hedis',
  CMS_CORE: 'cms_core',
  REGISTRY: 'registry',
  MIPS: 'mips',
  UNKNOWN: 'unknown',
};

/**
 * Human-readable labels for catalogue types
 */
export const CATALOGUE_LABELS = {
  ecqm: 'eCQM',
  hedis: 'HEDIS',
  cms_core: 'CMS Core',
  registry: 'Registry/QCDR',
  mips: 'MIPS',
  unknown: 'Unknown',
};

/**
 * Detect the catalogue type for a measure specification
 *
 * @param {Object} measureSpec - The measure specification object
 * @returns {string} - The detected catalogue type
 */
export function detectCatalogueType(measureSpec) {
  if (!measureSpec) return CATALOGUE_TYPES.UNKNOWN;

  // Build text corpus from available fields
  const textParts = [
    measureSpec.title || '',
    measureSpec.description || '',
    measureSpec.metadata?.steward || '',
    measureSpec.metadata?.description || '',
    measureSpec.metadata?.rationale || '',
    measureSpec.metadata?.measureSet || '',
    measureSpec.metadata?.program || '',
  ];
  const text = textParts.join(' ').toLowerCase();

  // Check for specific identifiers in order of specificity

  // HEDIS - National Committee for Quality Assurance
  if (text.includes('hedis') || text.includes('ncqa') || text.includes('national committee for quality assurance')) {
    return CATALOGUE_TYPES.HEDIS;
  }

  // CMS Core Measures - The Joint Commission
  if (text.includes('core measure') || text.includes('the joint commission') || text.includes('hospital quality')) {
    return CATALOGUE_TYPES.CMS_CORE;
  }

  // MIPS - Merit-based Incentive Payment System
  if (text.includes('mips') || text.includes('merit-based') || text.includes('macra')) {
    return CATALOGUE_TYPES.MIPS;
  }

  // Registry/QCDR measures
  if (text.includes('registry') || text.includes('qcdr') || text.includes('qualified clinical data registry')) {
    return CATALOGUE_TYPES.REGISTRY;
  }

  // eCQM - Electronic Clinical Quality Measures
  if (text.includes('cms') && text.includes('ecqm')) {
    return CATALOGUE_TYPES.ECQM;
  }

  if (text.includes('electronic clinical quality') || text.includes('e-clinical quality')) {
    return CATALOGUE_TYPES.ECQM;
  }

  // Check measure ID patterns
  const measureId = measureSpec.measureId || measureSpec.metadata?.measureId || '';

  // CMS measures (CMS123, CMS-123, etc.)
  if (/^CMS[-_]?\d+/i.test(measureId)) {
    return CATALOGUE_TYPES.ECQM;
  }

  // NQF measures
  if (/^NQF[-_]?\d+/i.test(measureId)) {
    return CATALOGUE_TYPES.ECQM;
  }

  // Additional heuristics based on common patterns

  // Check for CMS in title/steward
  if (text.includes('centers for medicare') || text.includes('cms quality')) {
    return CATALOGUE_TYPES.ECQM;
  }

  // Check for measure set indicators
  if (measureSpec.metadata?.measureSet?.toLowerCase().includes('cms')) {
    return CATALOGUE_TYPES.ECQM;
  }

  return CATALOGUE_TYPES.UNKNOWN;
}

/**
 * Get all available catalogue type options for filtering
 *
 * @returns {Array<{value: string, label: string}>}
 */
export function getCatalogueTypeOptions() {
  return [
    { value: 'all', label: 'All Catalogues' },
    ...Object.entries(CATALOGUE_LABELS).map(([value, label]) => ({ value, label })),
  ];
}

/**
 * Get the display label for a catalogue type
 *
 * @param {string} catalogueType - The catalogue type key
 * @returns {string} - Human-readable label
 */
export function getCatalogueLabel(catalogueType) {
  return CATALOGUE_LABELS[catalogueType] || CATALOGUE_LABELS.unknown;
}
