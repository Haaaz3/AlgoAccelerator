/**
 * API Response Transformers
 *
 * Converts backend DTOs to frontend UMS types.
 * Handles data shape differences between Java backend and React frontend.
 */

// ============================================================================
// Mapping Helpers
// ============================================================================

function mapConfidence(confidence) {
  if (confidence === 'HIGH' || confidence === 'high') return 'high';
  if (confidence === 'LOW' || confidence === 'low') return 'low';
  return 'medium';
}

function mapReviewStatus(status) {
  if (status === 'APPROVED' || status === 'approved') return 'approved';
  if (status === 'FLAGGED' || status === 'flagged') return 'flagged';
  if (status === 'NEEDS_REVISION' || status === 'needs_revision') return 'needs_revision';
  return 'pending';
}

function mapMeasureStatus(status) {
  if (status === 'PUBLISHED' || status === 'published') return 'published';
  return 'in_progress';
}

/**
 * Map UPPER_SNAKE_CASE population type to kebab-case
 */
function mapPopulationType(type) {
  const mapping = {
    'INITIAL_POPULATION': 'initial-population',
    'DENOMINATOR': 'denominator',
    'DENOMINATOR_EXCLUSION': 'denominator-exclusion',
    'DENOMINATOR_EXCEPTION': 'denominator-exception',
    'NUMERATOR': 'numerator',
    'NUMERATOR_EXCLUSION': 'numerator-exclusion',
    'MEASURE_POPULATION': 'measure-population',
    'MEASURE_OBSERVATION': 'measure-observation',
  };
  return mapping[type] || type?.toLowerCase()?.replace(/_/g, '-') || 'initial-population';
}

function mapLogicalOperator(operator) {
  if (operator === 'OR') return 'OR';
  if (operator === 'NOT') return 'NOT';
  return 'AND';
}

function mapElementType(type) {
  const mapping = {
    'DIAGNOSIS': 'diagnosis',
    'ENCOUNTER': 'encounter',
    'PROCEDURE': 'procedure',
    'OBSERVATION': 'observation',
    'MEDICATION': 'medication',
    'DEMOGRAPHIC': 'demographic',
    'IMMUNIZATION': 'immunization',
    'DEVICE': 'device',
    'ASSESSMENT': 'assessment',
    'ALLERGY': 'allergy',
    'COMMUNICATION': 'communication',
    'GOAL': 'goal',
  };
  return mapping[type] || type?.toLowerCase() || 'observation';
}

function mapMeasureType(type) {
  if (type === 'outcome') return 'outcome';
  if (type === 'structure') return 'structure';
  if (type === 'patient_experience') return 'patient_experience';
  return 'process';
}

function mapProgram(program) {
  if (program === 'MIPS_CQM' || program === 'MIPS') return 'MIPS_CQM';
  if (program === 'eCQM') return 'eCQM';
  if (program === 'HEDIS') return 'HEDIS';
  if (program === 'QOF') return 'QOF';
  if (program === 'Registry') return 'Registry';
  return 'Custom';
}

// ============================================================================
// Data Element Transformer
// ============================================================================

function transformDataElement(dto) {
  return {
    id: dto.id,
    type: mapElementType(dto.elementType),
    description: dto.description || '',
    libraryComponentId: dto.libraryComponentId || undefined,
    negation: dto.negation || false,
    negationRationale: dto.negationRationale || undefined,
    confidence: mapConfidence(dto.confidence),
    reviewStatus: mapReviewStatus(dto.reviewStatus),
    thresholds: dto.thresholds ? {
      ageMin: dto.thresholds.ageMin ?? undefined,
      ageMax: dto.thresholds.ageMax ?? undefined,
      valueMin: dto.thresholds.valueMin ?? undefined,
      valueMax: dto.thresholds.valueMax ?? undefined,
      comparator: dto.thresholds.comparator || undefined,
      unit: dto.thresholds.unit || undefined,
    } : undefined,
    valueSet: dto.valueSet ? {
      id: dto.valueSet.id,
      oid: dto.valueSet.oid,
      name: dto.valueSet.name,
      codes: dto.valueSet.codes || [],
    } : undefined,
  };
}

// ============================================================================
// Logical Clause Transformer
// ============================================================================

/**
 * Transform backend rootClause to frontend criteria
 *
 * Backend structure:
 *   rootClause: { operator, dataElements: [...], children: [...] }
 *
 * Frontend structure:
 *   criteria: { operator, children: [...dataElements, ...nestedClauses] }
 */
function transformLogicalClause(dto) {
  if (!dto) {
    return {
      id: `clause-${Date.now()}`,
      operator: 'AND',
      description: '',
      children: [],
      confidence: 'medium',
      reviewStatus: 'pending',
    };
  }

  // Children array combines dataElements and nested children
  const children = [];

  // Add transformed data elements first
  if (dto.dataElements && Array.isArray(dto.dataElements)) {
    children.push(...dto.dataElements.map(transformDataElement));
  }

  // Add transformed nested clauses
  if (dto.children && Array.isArray(dto.children)) {
    children.push(...dto.children.map(transformLogicalClause));
  }

  return {
    id: dto.id || `clause-${Date.now()}`,
    operator: mapLogicalOperator(dto.operator),
    description: dto.description || '',
    children,
    confidence: mapConfidence(dto.confidence),
    reviewStatus: mapReviewStatus(dto.reviewStatus),
  };
}

// ============================================================================
// Population Transformer
// ============================================================================

function transformPopulation(dto) {
  return {
    id: dto.id,
    type: mapPopulationType(dto.populationType),
    description: dto.description || '',
    narrative: dto.narrative || '',
    criteria: transformLogicalClause(dto.rootClause),
    confidence: mapConfidence(dto.confidence),
    reviewStatus: mapReviewStatus(dto.reviewStatus),
    reviewNotes: dto.reviewNotes || undefined,
    cqlDefinition: dto.cqlDefinition || undefined,
    cqlDefinitionName: dto.cqlDefinitionName || undefined,
  };
}

// ============================================================================
// Value Set Transformer
// ============================================================================

function transformValueSet(dto) {
  return {
    id: dto.id,
    oid: dto.oid || undefined,
    url: dto.url || undefined,
    name: dto.name,
    version: dto.version || undefined,
    publisher: dto.publisher || undefined,
    purpose: dto.purpose || undefined,
    confidence: mapConfidence(dto.confidence),
    verified: dto.verified,
    source: dto.source || undefined,
    codes: dto.codes?.map(c => ({
      code: c.code,
      display: c.display || '',
      system: c.system || 'SNOMED',
    })) || [],
  };
}

// ============================================================================
// Main Measure Transformer
// ============================================================================

/**
 * Transform backend MeasureDto to frontend UniversalMeasureSpec
 */
export function transformMeasureDto(dto) {
  // Count review progress from populations
  let total = 0, approved = 0, pending = 0, flagged = 0;

  const countStatus = (clause) => {
    if (!clause) return;
    if (clause.dataElements) {
      clause.dataElements.forEach(de => {
        total++;
        const status = mapReviewStatus(de.reviewStatus);
        if (status === 'approved') approved++;
        else if (status === 'pending') pending++;
        else if (status === 'flagged' || status === 'needs_revision') flagged++;
      });
    }
    if (clause.children) {
      clause.children.forEach(countStatus);
    }
  };

  dto.populations?.forEach(p => countStatus(p.rootClause));

  return {
    id: dto.id,
    resourceType: 'Measure',
    metadata: {
      measureId: dto.measureId || dto.id,
      title: dto.title || 'Untitled Measure',
      version: dto.version || '1.0.0',
      steward: dto.steward || 'Unknown',
      program: mapProgram(dto.program),
      measureType: mapMeasureType(dto.measureType),
      description: dto.description || '',
      rationale: dto.rationale || undefined,
      clinicalRecommendation: dto.clinicalRecommendation || undefined,
      measurementPeriod: {
        start: dto.periodStart || new Date().getFullYear() + '-01-01',
        end: dto.periodEnd || new Date().getFullYear() + '-12-31',
        inclusive: true,
      },
      lastUpdated: dto.updatedAt || new Date().toISOString(),
    },
    populations: dto.populations?.map(transformPopulation) || [],
    valueSets: dto.valueSets?.map(transformValueSet) || [],
    globalConstraints: dto.globalConstraints ? {
      ageRange: (dto.globalConstraints.ageMin != null || dto.globalConstraints.ageMax != null) ? {
        min: dto.globalConstraints.ageMin ?? 0,
        max: dto.globalConstraints.ageMax ?? 150,
      } : undefined,
      gender: dto.globalConstraints.gender || undefined,
    } : undefined,
    status: mapMeasureStatus(dto.status),
    overallConfidence: mapConfidence(dto.overallConfidence),
    reviewProgress: { total, approved, pending, flagged },
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    createdBy: dto.createdBy || undefined,
    lockedAt: dto.lockedAt || undefined,
    lockedBy: dto.lockedBy || undefined,
    generatedCql: dto.generatedCql || undefined,
    generatedSql: dto.generatedSql || undefined,
    corrections: dto.corrections?.map(c => ({
      id: c.id,
      timestamp: c.timestamp,
      correctionType: c.correctionType,
      componentId: c.field || '',
      componentPath: c.field || '',
      originalValue: c.oldValue,
      correctedValue: c.newValue,
      userNotes: c.description || undefined,
      measureContext: {
        measureId: dto.measureId || dto.id,
        measureType: dto.measureType || 'process',
        program: dto.program || '',
      },
    })) || [],
  };
}

/**
 * Transform a list of measure summaries (for library view)
 */
export function transformMeasureSummaries(dtos) {
  return dtos.map(dto => ({
    id: dto.id,
    measureId: dto.measureId || dto.id,
    title: dto.title || 'Untitled',
    program: mapProgram(dto.program),
    status: mapMeasureStatus(dto.status),
    populationCount: dto.populationCount || 0,
    updatedAt: dto.updatedAt || new Date().toISOString(),
  }));
}

export default {
  transformMeasureDto,
  transformMeasureSummaries,
};
