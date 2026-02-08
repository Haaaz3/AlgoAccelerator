/**
 * Test Fixtures for Integration Tests
 *
 * Factory functions to create realistic test data for measures and components.
 */

import type {
  UniversalMeasureSpec,
  PopulationDefinition,
  LogicalClause,
  DataElement,
  ValueSetReference,
  CodeReference,
} from '../../types/ums';
import type {
  LibraryComponent,
  AtomicComponent,
  ComponentValueSet,
  ComponentComplexity,
  ComponentVersionInfo,
  ComponentUsage,
} from '../../types/componentLibrary';

// ============================================================================
// ID Generator
// ============================================================================

let idCounter = 0;
export function generateId(prefix: string = 'test'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Code Reference Factory
// ============================================================================

export function createTestCode(overrides?: Partial<CodeReference>): CodeReference {
  return {
    code: overrides?.code ?? `CODE-${generateId()}`,
    display: overrides?.display ?? 'Test Code Display',
    system: overrides?.system ?? 'SNOMED',
    ...overrides,
  };
}

// ============================================================================
// Value Set Factory
// ============================================================================

export function createTestValueSet(overrides?: Partial<ValueSetReference>): ValueSetReference {
  const id = overrides?.id ?? generateId('vs');
  return {
    id,
    oid: overrides?.oid ?? `2.16.840.1.113883.3.464.1003.${id}`,
    name: overrides?.name ?? `Test Value Set ${id}`,
    version: overrides?.version ?? '20240101',
    codes: overrides?.codes ?? [
      createTestCode({ code: 'CODE1', display: 'First Code' }),
      createTestCode({ code: 'CODE2', display: 'Second Code' }),
    ],
    confidence: overrides?.confidence ?? 'high',
    source: overrides?.source ?? 'test',
    ...overrides,
  };
}

// ============================================================================
// Data Element Factory
// ============================================================================

export function createTestDataElement(overrides?: Partial<DataElement>): DataElement {
  const id = overrides?.id ?? generateId('elem');
  return {
    id,
    type: overrides?.type ?? 'diagnosis',
    description: overrides?.description ?? `Test Data Element ${id}`,
    valueSet: overrides?.valueSet,
    confidence: overrides?.confidence ?? 'high',
    reviewStatus: overrides?.reviewStatus ?? 'approved',
    libraryComponentId: overrides?.libraryComponentId,
    ...overrides,
  };
}

// ============================================================================
// Logical Clause Factory
// ============================================================================

export function createTestLogicalClause(overrides?: Partial<LogicalClause>): LogicalClause {
  const id = overrides?.id ?? generateId('clause');
  return {
    id,
    operator: overrides?.operator ?? 'AND',
    description: overrides?.description ?? `Test Clause ${id}`,
    children: overrides?.children ?? [],
    confidence: overrides?.confidence ?? 'high',
    reviewStatus: overrides?.reviewStatus ?? 'approved',
    ...overrides,
  };
}

// ============================================================================
// Population Definition Factory
// ============================================================================

export function createTestPopulation(overrides?: Partial<PopulationDefinition>): PopulationDefinition {
  const id = overrides?.id ?? generateId('pop');
  return {
    id,
    type: overrides?.type ?? 'initial-population',
    description: overrides?.description ?? `Test Population ${id}`,
    narrative: overrides?.narrative ?? 'Test population narrative',
    criteria: overrides?.criteria ?? createTestLogicalClause(),
    confidence: overrides?.confidence ?? 'high',
    reviewStatus: overrides?.reviewStatus ?? 'approved',
    ...overrides,
  };
}

// ============================================================================
// Component Factory
// ============================================================================

export function createTestComponent(overrides?: Partial<AtomicComponent>): AtomicComponent {
  const id = overrides?.id ?? generateId('comp');
  const now = new Date().toISOString();

  const defaultComplexity: ComponentComplexity = {
    level: 'low',
    score: 1,
    factors: { base: 1, timingClauses: 0, negations: 0 },
  };

  const defaultVersionInfo: ComponentVersionInfo = {
    versionId: '1.0',
    versionHistory: [
      {
        versionId: '1.0',
        status: 'approved',
        createdAt: now,
        createdBy: 'test',
        changeDescription: 'Initial version',
      },
    ],
    status: 'approved',
    approvedBy: 'test',
    approvedAt: now,
  };

  const defaultUsage: ComponentUsage = {
    measureIds: [],
    usageCount: 0,
  };

  const defaultValueSet: ComponentValueSet = {
    oid: `2.16.840.1.113883.3.464.1003.${id}`,
    version: '20240101',
    name: `Component Value Set ${id}`,
    codes: [
      createTestCode({ code: 'COMP-CODE1', display: 'Component Code 1' }),
      createTestCode({ code: 'COMP-CODE2', display: 'Component Code 2' }),
    ],
  };

  return {
    type: 'atomic',
    id,
    name: overrides?.name ?? `Test Component ${id}`,
    description: overrides?.description ?? `Description for ${id}`,
    valueSet: overrides?.valueSet ?? defaultValueSet,
    valueSets: overrides?.valueSets,
    timing: overrides?.timing ?? {
      operator: 'during',
      reference: 'Measurement Period',
      displayExpression: 'during Measurement Period',
    },
    negation: overrides?.negation ?? false,
    complexity: overrides?.complexity ?? defaultComplexity,
    versionInfo: overrides?.versionInfo ?? defaultVersionInfo,
    usage: overrides?.usage ?? defaultUsage,
    metadata: overrides?.metadata ?? {
      category: 'conditions',
      tags: ['test'],
      createdAt: now,
      createdBy: 'test',
      updatedAt: now,
      updatedBy: 'test',
      source: { origin: 'custom' },
    },
    ...overrides,
  };
}

// ============================================================================
// Full Measure Factory
// ============================================================================

export interface CreateTestMeasureOptions {
  measureId?: string;
  title?: string;
  withComponents?: boolean;
  valueSets?: ValueSetReference[];
  populations?: PopulationDefinition[];
}

/**
 * Creates a realistic UniversalMeasureSpec with:
 * - 2 populations (initial-population and numerator)
 * - Each with a LogicalClause containing 2 DataElements
 * - 3 value sets each with 2-3 codes
 * - libraryComponentId set on each DataElement (if withComponents is true)
 */
export function createTestMeasure(options: CreateTestMeasureOptions = {}): {
  measure: UniversalMeasureSpec;
  components: AtomicComponent[];
  valueSets: ValueSetReference[];
} {
  const measureId = options.measureId ?? generateId('measure');
  const now = new Date().toISOString();

  // Create 3 value sets with codes
  const valueSets = options.valueSets ?? [
    createTestValueSet({
      id: 'vs-1',
      name: 'Diabetes Diagnosis',
      codes: [
        createTestCode({ code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', system: 'ICD10CM' }),
        createTestCode({ code: 'E11.65', display: 'Type 2 diabetes mellitus with hyperglycemia', system: 'ICD10CM' }),
      ],
    }),
    createTestValueSet({
      id: 'vs-2',
      name: 'Office Visit',
      codes: [
        createTestCode({ code: '99213', display: 'Office or other outpatient visit, established patient', system: 'CPT' }),
        createTestCode({ code: '99214', display: 'Office or other outpatient visit, established patient', system: 'CPT' }),
        createTestCode({ code: '99215', display: 'Office or other outpatient visit, established patient', system: 'CPT' }),
      ],
    }),
    createTestValueSet({
      id: 'vs-3',
      name: 'HbA1c Test',
      codes: [
        createTestCode({ code: '4548-4', display: 'Hemoglobin A1c', system: 'LOINC' }),
        createTestCode({ code: '17856-6', display: 'Hemoglobin A1c/Hemoglobin', system: 'LOINC' }),
      ],
    }),
  ];

  // Create components if requested
  const components: AtomicComponent[] = [];
  if (options.withComponents !== false) {
    for (const vs of valueSets) {
      const comp = createTestComponent({
        id: `comp-${vs.id}`,
        name: vs.name,
        valueSet: {
          oid: vs.oid ?? '',
          version: vs.version ?? '20240101',
          name: vs.name,
          codes: vs.codes,
        },
      });
      components.push(comp);
    }
  }

  // Create data elements linked to value sets and components
  const createLinkedDataElement = (vs: ValueSetReference, type: DataElement['type']) => {
    const componentId = options.withComponents !== false ? `comp-${vs.id}` : undefined;
    return createTestDataElement({
      type,
      description: vs.name,
      valueSet: vs,
      libraryComponentId: componentId,
    });
  };

  // Create populations with data elements
  const ipElements = [
    createLinkedDataElement(valueSets[0], 'diagnosis'),
    createLinkedDataElement(valueSets[1], 'encounter'),
  ];

  const numElements = [
    createLinkedDataElement(valueSets[2], 'observation'),
    createLinkedDataElement(valueSets[1], 'encounter'),
  ];

  const populations = options.populations ?? [
    createTestPopulation({
      id: 'pop-ip',
      type: 'initial-population',
      description: 'Initial Population',
      narrative: 'Patients with diabetes and qualifying encounter',
      criteria: createTestLogicalClause({
        id: 'clause-ip',
        operator: 'AND',
        children: ipElements,
      }),
    }),
    createTestPopulation({
      id: 'pop-num',
      type: 'numerator',
      description: 'Numerator',
      narrative: 'Patients with HbA1c test performed',
      criteria: createTestLogicalClause({
        id: 'clause-num',
        operator: 'AND',
        children: numElements,
      }),
    }),
  ];

  const measure: UniversalMeasureSpec = {
    id: measureId,
    resourceType: 'Measure',
    metadata: {
      measureId: options.measureId ?? `CMS-TEST-${measureId}`,
      title: options.title ?? `Test Measure ${measureId}`,
      version: '1.0.0',
      steward: 'Test Organization',
      program: 'eCQM',
      measureType: 'process',
      description: 'A test measure for integration testing',
      measurementPeriod: {
        start: '2025-01-01',
        end: '2025-12-31',
        inclusive: true,
      },
      lastUpdated: now,
    },
    populations,
    valueSets,
    status: 'in_progress',
    overallConfidence: 'high',
    reviewProgress: {
      total: 4,
      approved: 4,
      pending: 0,
      flagged: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  return { measure, components, valueSets };
}

/**
 * Creates a measure with specific characteristics for edge case testing
 */
export function createEdgeCaseMeasure(type: 'empty-populations' | 'no-codes' | 'null-criteria'): UniversalMeasureSpec {
  const base = createTestMeasure({ withComponents: false });

  switch (type) {
    case 'empty-populations':
      return {
        ...base.measure,
        populations: [],
      };

    case 'no-codes':
      return {
        ...base.measure,
        valueSets: base.valueSets.map(vs => ({ ...vs, codes: [] })),
      };

    case 'null-criteria':
      return {
        ...base.measure,
        populations: base.measure.populations.map(pop => ({
          ...pop,
          criteria: createTestLogicalClause({ children: [] }),
        })),
      };

    default:
      return base.measure;
  }
}
