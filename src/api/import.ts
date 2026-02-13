/**
 * Import/Export API client.
 */

import { get, post } from './client';

// Request/Response types

export interface ImportRequest {
  measures?: Record<string, unknown>[];
  components?: Record<string, unknown>[];
  validationTraces?: Record<string, unknown>[];
  codeStates?: Record<string, unknown>;
  version?: number;
  exportedAt?: string;
}

export interface ImportResult {
  componentsImported: number;
  measuresImported: number;
  validationTracesImported: number;
  success: boolean;
  message: string;
}

export interface ExportData {
  measures: Record<string, unknown>[];
  components: Record<string, unknown>[];
  version: number;
  exportedAt: string;
}

// API functions

/**
 * Import data from Zustand export format.
 */
export async function importData(data: ImportRequest): Promise<ImportResult> {
  return post<ImportResult>('/import', data);
}

/**
 * Export all data to Zustand format.
 */
export async function exportData(): Promise<ExportData> {
  return get<ExportData>('/import/export');
}
