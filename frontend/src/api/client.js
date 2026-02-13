/**
 * Base API client for communicating with the Java backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * HTTP error with status code and response body.
 */
export class ApiError extends Error {
  constructor(status, statusText, body) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Make an API request with automatic JSON handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  return JSON.parse(text);
}

/**
 * GET request.
 */
export async function get(endpoint, params) {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url = `${endpoint}?${searchParams.toString()}`;
  }
  return request(url, { method: 'GET' });
}

/**
 * POST request.
 */
export async function post(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request.
 */
export async function put(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request.
 */
export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

export default {
  get,
  post,
  put,
  del,
};
