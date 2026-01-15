/**
 * API Client for Measure Accelerator Backend
 *
 * Provides unified interface for:
 * - VSAC value set operations
 * - LLM extraction/chat
 *
 * Falls back to direct API calls if backend is unavailable
 */

// Backend API URL - will be set via environment variable in production
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// VSAC API
// =============================================================================

export interface VSACValueSet {
  id: string;
  oid: string;
  name: string;
  title?: string;
  version?: string;
  status?: string;
  publisher?: string;
  description?: string;
  totalCodes?: number;
  codes?: VSACCode[];
}

export interface VSACCode {
  code: string;
  system: string;
  display: string;
  version?: string;
}

export interface VSACSearchResult {
  total: number;
  valueSets: VSACValueSet[];
}

/**
 * Search VSAC for value sets
 */
export async function searchVSAC(
  query: string,
  vsacApiKey: string,
  count = 20
): Promise<VSACSearchResult> {
  const response = await fetch(
    `${API_BASE}/api/vsac/search?query=${encodeURIComponent(query)}&count=${count}`,
    {
      headers: {
        'x-vsac-api-key': vsacApiKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'VSAC search failed');
  }

  return response.json();
}

/**
 * Get value set metadata by OID
 */
export async function getVSACValueSet(
  oid: string,
  vsacApiKey: string
): Promise<VSACValueSet> {
  const response = await fetch(`${API_BASE}/api/vsac/valueset/${oid}`, {
    headers: {
      'x-vsac-api-key': vsacApiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get value set');
  }

  return response.json();
}

/**
 * Expand value set to get all codes
 */
export async function expandVSACValueSet(
  oid: string,
  vsacApiKey: string,
  version?: string
): Promise<VSACValueSet> {
  let url = `${API_BASE}/api/vsac/expand/${oid}`;
  if (version) {
    url += `?version=${encodeURIComponent(version)}`;
  }

  const response = await fetch(url, {
    headers: {
      'x-vsac-api-key': vsacApiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to expand value set');
  }

  return response.json();
}

/**
 * Validate if a code is in a value set
 */
export async function validateCodeInVSAC(
  valueSetOid: string,
  code: string,
  system: string,
  vsacApiKey: string
): Promise<{ valid: boolean; display?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/api/vsac/validate-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vsac-api-key': vsacApiKey,
    },
    body: JSON.stringify({ valueSetOid, code, system }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Code validation failed');
  }

  return response.json();
}

// =============================================================================
// LLM API
// =============================================================================

export type LLMProvider = 'anthropic' | 'openai' | 'google';

export interface LLMResponse {
  provider: string;
  model: string;
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  stopReason?: string;
}

/**
 * Extract measure specification using LLM via backend proxy
 */
export async function extractWithLLM(
  content: string,
  systemPrompt: string,
  provider: LLMProvider,
  model: string,
  apiKey: string
): Promise<LLMResponse> {
  const response = await fetch(`${API_BASE}/api/llm/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [`x-${provider}-api-key`]: apiKey,
    },
    body: JSON.stringify({
      provider,
      model,
      content,
      systemPrompt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'LLM extraction failed');
  }

  return response.json();
}

/**
 * Chat with LLM via backend proxy
 */
export async function chatWithLLM(
  messages: Array<{ role: string; content: string }>,
  provider: LLMProvider,
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<LLMResponse> {
  const response = await fetch(`${API_BASE}/api/llm/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [`x-${provider}-api-key`]: apiKey,
    },
    body: JSON.stringify({
      provider,
      model,
      messages,
      systemPrompt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'LLM chat failed');
  }

  return response.json();
}

/**
 * Get available LLM models
 */
export async function getLLMModels(): Promise<{
  providers: Array<{ id: string; models: string[] }>;
}> {
  const response = await fetch(`${API_BASE}/api/llm/models`);

  if (!response.ok) {
    throw new Error('Failed to get LLM models');
  }

  return response.json();
}
