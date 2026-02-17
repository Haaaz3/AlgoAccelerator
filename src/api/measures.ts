/**
 * Measure API client.
 */

import { get, post, put, del } from './client';
import type { UniversalMeasureSpec } from '../types/ums';

// Response types matching backend DTOs

export interface MeasureSummary {
  id: string;
  measureId: string;
  title: string;
  program: string | null;
  status: string | null;
  populationCount: number;
  updatedAt: string;
}

export interface GlobalConstraints {
  ageMin: number | null;
  ageMax: number | null;
  ageCalculation: string | null;
  gender: string | null;
  measurementPeriodType: string | null;
  measurementPeriodAnchor: string | null;
}

export interface DataElementDto {
  id: string;
  elementType: string;
  resourceType: string;
  description: string;
  libraryComponentId: string | null;
  negation: boolean;
  negationRationale: string | null;
  genderValue: string | null;
  thresholds: {
    ageMin: number | null;
    ageMax: number | null;
    valueMin: number | null;
    valueMax: number | null;
    comparator: string | null;
    unit: string | null;
  } | null;
  timingOverride: string | null;
  additionalRequirements: string | null;
  confidence: string | null;
  reviewStatus: string | null;
  displayOrder: number;
}

export interface LogicalClauseDto {
  id: string;
  operator: string;
  description: string | null;
  displayOrder: number;
  children: LogicalClauseDto[];
  dataElements: DataElementDto[];
}

export interface PopulationDto {
  id: string;
  populationType: string;
  description: string | null;
  narrative: string | null;
  rootClause: LogicalClauseDto | null;
  displayOrder: number;
  confidence: string | null;
  reviewStatus: string | null;
  reviewNotes: string | null;
  cqlDefinition: string | null;
  cqlDefinitionName: string | null;
}

export interface ValueSetCodeDto {
  id: string;
  code: string;
  system: string;
  display: string | null;
  version: string | null;
}

export interface ValueSetDto {
  id: string;
  oid: string | null;
  url: string | null;
  name: string;
  version: string | null;
  publisher: string | null;
  purpose: string | null;
  confidence: string | null;
  verified: boolean;
  source: string | null;
  codes: ValueSetCodeDto[];
}

export interface CorrectionDto {
  id: string;
  correctionType: string;
  description: string | null;
  author: string | null;
  timestamp: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export interface MeasureDto {
  id: string;
  measureId: string;
  title: string;
  version: string | null;
  steward: string | null;
  program: string | null;
  measureType: string | null;
  description: string | null;
  rationale: string | null;
  clinicalRecommendation: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  globalConstraints: GlobalConstraints | null;
  status: string | null;
  overallConfidence: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  populations: PopulationDto[];
  valueSets: ValueSetDto[];
  corrections: CorrectionDto[];
  generatedCql: string | null;
  generatedSql: string | null;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CreateMeasureRequest {
  measureId: string;
  title: string;
  version?: string;
  steward?: string;
  program?: string;
  measureType?: string;
  description?: string;
  rationale?: string;
  clinicalRecommendation?: string;
  periodStart?: string;
  periodEnd?: string;
  globalConstraints?: {
    ageMin?: number;
    ageMax?: number;
    ageCalculation?: string;
    gender?: string;
  };
  status?: string;
}

export interface UpdateMeasureRequest {
  measureId?: string;
  title?: string;
  version?: string;
  steward?: string;
  program?: string;
  measureType?: string;
  description?: string;
  rationale?: string;
  clinicalRecommendation?: string;
  periodStart?: string;
  periodEnd?: string;
  globalConstraints?: {
    ageMin?: number;
    ageMax?: number;
    ageCalculation?: string;
    gender?: string;
  };
  status?: string;
  overallConfidence?: string;
}

export interface ValidationSummary {
  totalPatients: number;
  inPopulation: number;
  inNumerator: number;
  excluded: number;
  performanceRate: number;
}

// API functions

/**
 * Get all measures (summaries only).
 */
export async function getMeasures(params?: {
  status?: string;
  search?: string;
}): Promise<MeasureSummary[]> {
  return get<MeasureSummary[]>('/measures', params);
}

/**
 * Get all measures with full details in a single request.
 * This eliminates the N+1 query problem by fetching everything at once.
 */
export async function getMeasuresFull(): Promise<MeasureDto[]> {
  return get<MeasureDto[]>('/measures/full');
}

/**
 * Get a measure by ID.
 */
export async function getMeasure(id: string): Promise<MeasureDto> {
  return get<MeasureDto>(`/measures/${id}`);
}

/**
 * Get a measure by CMS measure ID.
 */
export async function getMeasureByMeasureId(measureId: string): Promise<MeasureDto> {
  return get<MeasureDto>(`/measures/by-measure-id/${measureId}`);
}

/**
 * Create a new measure.
 */
export async function createMeasure(request: CreateMeasureRequest): Promise<MeasureDto> {
  return post<MeasureDto>('/measures', request);
}

/**
 * Update a measure.
 */
export async function updateMeasure(id: string, request: UpdateMeasureRequest): Promise<MeasureDto> {
  return put<MeasureDto>(`/measures/${id}`, request);
}

/**
 * Delete a measure.
 */
export async function deleteMeasure(id: string): Promise<void> {
  return del<void>(`/measures/${id}`);
}

/**
 * Lock a measure.
 */
export async function lockMeasure(id: string, lockedBy: string): Promise<MeasureDto> {
  return post<MeasureDto>(`/measures/${id}/lock`, { lockedBy });
}

/**
 * Unlock a measure.
 */
export async function unlockMeasure(id: string): Promise<MeasureDto> {
  return post<MeasureDto>(`/measures/${id}/unlock`);
}

/**
 * Get validation summary for a measure.
 */
export async function getValidationSummary(id: string): Promise<ValidationSummary> {
  return get<ValidationSummary>(`/measures/${id}/validate/summary`);
}

/**
 * Generate CQL for a measure.
 */
export async function generateCql(id: string): Promise<{ cql: string }> {
  return get<{ cql: string }>(`/measures/${id}/cql`);
}

/**
 * Generate SQL for a measure.
 */
export async function generateSql(id: string): Promise<{ sql: string }> {
  return get<{ sql: string }>(`/measures/${id}/sql`);
}

/**
 * Generate both CQL and SQL for a measure.
 */
export async function generateCode(id: string): Promise<{ cql: string; sql: string }> {
  return get<{ cql: string; sql: string }>(`/measures/${id}/code`);
}

// Import/Export Types

export interface ImportRequest {
  measures?: Array<Record<string, unknown>>;
  components?: Array<Record<string, unknown>>;
  validationTraces?: Array<Record<string, unknown>>;
  codeStates?: Record<string, unknown>;
  version?: number;
  exportedAt?: string;
}

export interface ImportResultDto {
  componentsImported: number;
  measuresImported: number;
  validationTracesImported: number;
  success: boolean;
  message: string;
}

/**
 * Import measures and components via the import endpoint.
 * This is the primary way to persist measures extracted via AI.
 */
export async function importMeasures(request: ImportRequest): Promise<ImportResultDto> {
  return post<ImportResultDto>('/import', request);
}
