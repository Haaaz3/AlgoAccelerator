/**
 * Measure API client.
 */

import { get, post, put, del } from './client.js';

/**
 * Get all measures.
 */
export async function getMeasures(params) {
  return get('/measures', params);
}

/**
 * Get a measure by ID.
 */
export async function getMeasure(id) {
  return get(`/measures/${id}`);
}

/**
 * Get a measure by CMS measure ID.
 */
export async function getMeasureByMeasureId(measureId) {
  return get(`/measures/by-measure-id/${measureId}`);
}

/**
 * Create a new measure.
 */
export async function createMeasure(request) {
  return post('/measures', request);
}

/**
 * Update a measure.
 */
export async function updateMeasure(id, request) {
  return put(`/measures/${id}`, request);
}

/**
 * Delete a measure.
 */
export async function deleteMeasure(id) {
  return del(`/measures/${id}`);
}

/**
 * Lock a measure.
 */
export async function lockMeasure(id, lockedBy) {
  return post(`/measures/${id}/lock`, { lockedBy });
}

/**
 * Unlock a measure.
 */
export async function unlockMeasure(id) {
  return post(`/measures/${id}/unlock`);
}

/**
 * Get validation summary for a measure.
 */
export async function getValidationSummary(id) {
  return get(`/measures/${id}/validate/summary`);
}

/**
 * Generate CQL for a measure.
 */
export async function generateCql(id) {
  return get(`/measures/${id}/cql`);
}

/**
 * Generate SQL for a measure.
 */
export async function generateSql(id) {
  return get(`/measures/${id}/sql`);
}

/**
 * Generate both CQL and SQL for a measure.
 */
export async function generateCode(id) {
  return get(`/measures/${id}/code`);
}
