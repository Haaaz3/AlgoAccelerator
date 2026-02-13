/**
 * Validation API client.
 */

import { get, post } from './client';

// Response types matching backend DTOs

export interface TestPatient {
  id: string;
  name: string;
  birthDate: string | null;
  gender: string;
  race: string | null;
  ethnicity: string | null;
}

export interface TestPatientDetail extends TestPatient {
  diagnoses: string;
  encounters: string;
  procedures: string;
  observations: string;
  medications: string;
  immunizations: string;
}

export interface ValidationFact {
  code: string;
  display: string;
  date: string | null;
  source: string;
}

export interface ValidationNode {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: 'pass' | 'fail';
  facts: ValidationFact[] | null;
  children: ValidationNode[] | null;
}

export interface PreCheckResult {
  checkType: string;
  met: boolean;
  description: string;
}

export interface PopulationResult {
  populationType: string;
  met: boolean;
  nodes: ValidationNode[];
}

export interface ValidationTrace {
  patientId: string;
  patientName: string;
  patientGender: string;
  narrative: string;
  finalOutcome: 'in_numerator' | 'not_in_numerator' | 'excluded' | 'not_in_population';
  preCheckResults: PreCheckResult[];
  populationResults: PopulationResult[];
  howClose: string[] | null;
}

export interface ValidationSummary {
  totalPatients: number;
  inPopulation: number;
  inNumerator: number;
  excluded: number;
  notInNumerator: number;
  performanceRate: number;
}

export interface ValidationResults {
  measureId: string;
  measureTitle: string;
  summary: ValidationSummary;
  traces: ValidationTrace[];
}

// API functions

/**
 * Get all test patients.
 */
export async function getAllTestPatients(): Promise<TestPatient[]> {
  return get<TestPatient[]>('/validation/patients');
}

/**
 * Get test patients filtered for a specific measure.
 */
export async function getTestPatientsForMeasure(measureId: string): Promise<TestPatient[]> {
  return get<TestPatient[]>(`/validation/patients/for-measure/${measureId}`);
}

/**
 * Get a specific test patient with full details.
 */
export async function getTestPatient(id: string): Promise<TestPatientDetail> {
  return get<TestPatientDetail>(`/validation/patients/${id}`);
}

/**
 * Evaluate a single patient against a measure.
 */
export async function evaluatePatient(
  measureId: string,
  patientId: string
): Promise<ValidationTrace> {
  return get<ValidationTrace>(`/validation/evaluate/${measureId}/${patientId}`);
}

/**
 * Evaluate all test patients against a measure.
 */
export async function evaluateAllPatients(measureId: string): Promise<ValidationResults> {
  return get<ValidationResults>(`/validation/evaluate/${measureId}`);
}

/**
 * Get validation summary for a measure.
 */
export async function getValidationSummary(measureId: string): Promise<ValidationSummary> {
  return get<ValidationSummary>(`/validation/summary/${measureId}`);
}
