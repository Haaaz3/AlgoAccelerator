/**
 * Validation API client.
 */

import { get } from './client.js';

/**
 * Get all test patients.
 */
export async function getAllTestPatients() {
  return get('/validation/patients');
}

/**
 * Get test patients filtered for a specific measure.
 */
export async function getTestPatientsForMeasure(measureId) {
  return get(`/validation/patients/for-measure/${measureId}`);
}

/**
 * Get a specific test patient with full details.
 */
export async function getTestPatient(id) {
  return get(`/validation/patients/${id}`);
}

/**
 * Evaluate a single patient against a measure.
 */
export async function evaluatePatient(measureId, patientId) {
  return get(`/validation/evaluate/${measureId}/${patientId}`);
}

/**
 * Evaluate all test patients against a measure.
 */
export async function evaluateAllPatients(measureId) {
  return get(`/validation/evaluate/${measureId}`);
}

/**
 * Get validation summary for a measure.
 */
export async function getValidationSummary(measureId) {
  return get(`/validation/summary/${measureId}`);
}
