/**
 * Component Library API client.
 */

import { get, post, put, del } from './client.js';

/**
 * Get all components.
 */
export async function getComponents(params) {
  return get('/components', params);
}

/**
 * Get a component by ID.
 */
export async function getComponent(id) {
  return get(`/components/${id}`);
}

/**
 * Create an atomic component.
 */
export async function createAtomicComponent(request) {
  return post('/components/atomic', request);
}

/**
 * Create a composite component.
 */
export async function createCompositeComponent(request) {
  return post('/components/composite', request);
}

/**
 * Update a component.
 */
export async function updateComponent(id, request) {
  return put(`/components/${id}`, request);
}

/**
 * Delete a component.
 */
export async function deleteComponent(id) {
  return del(`/components/${id}`);
}

/**
 * Set component category.
 */
export async function setComponentCategory(id, category) {
  return post(`/components/${id}/category`, { category });
}

/**
 * Create a new version of a component.
 */
export async function createComponentVersion(id, changes) {
  return post(`/components/${id}/version`, { changes });
}

/**
 * Approve a component.
 */
export async function approveComponent(id, approvedBy) {
  return post(`/components/${id}/approve`, { approvedBy });
}

/**
 * Find matching components for a description.
 */
export async function findMatches(description) {
  return post('/components/match', { description });
}

/**
 * Record component usage.
 */
export async function recordUsage(componentId, measureId) {
  return post(`/components/${componentId}/usage`, { measureId });
}

/**
 * Get component statistics.
 */
export async function getComponentStats() {
  return get('/components/stats');
}
