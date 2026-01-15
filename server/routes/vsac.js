/**
 * VSAC (Value Set Authority Center) API Routes
 *
 * Integrates with NLM's VSAC FHIR Terminology Service
 * Requires UMLS API key (free from https://uts.nlm.nih.gov/uts/)
 *
 * VSAC FHIR Base URL: https://cts.nlm.nih.gov/fhir/
 */

import express from 'express';
import fetch from 'node-fetch';

export const vsacRouter = express.Router();

const VSAC_FHIR_BASE = 'https://cts.nlm.nih.gov/fhir';

/**
 * Get VSAC API key from request header or environment
 */
function getApiKey(req) {
  return req.headers['x-vsac-api-key'] || process.env.VSAC_API_KEY;
}

/**
 * Make authenticated request to VSAC FHIR API
 */
async function vsacFetch(endpoint, apiKey, options = {}) {
  const url = `${VSAC_FHIR_BASE}${endpoint}`;
  console.log(`VSAC Request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/fhir+json',
      'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`VSAC Error (${response.status}):`, errorText);
    throw new Error(`VSAC API error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/vsac/search
 * Search for value sets by name or keyword
 *
 * Query params:
 *   - query: Search term
 *   - count: Number of results (default 20)
 */
vsacRouter.get('/search', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'VSAC API key required',
        help: 'Get a free API key at https://uts.nlm.nih.gov/uts/',
      });
    }

    const { query, count = 20 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Search value sets using FHIR ValueSet search
    const searchParams = new URLSearchParams({
      name: query,
      _count: count,
    });

    const result = await vsacFetch(`/ValueSet?${searchParams}`, apiKey);

    // Transform FHIR Bundle to simpler format
    const valueSets = (result.entry || []).map(entry => ({
      id: entry.resource.id,
      oid: entry.resource.identifier?.[0]?.value || entry.resource.id,
      name: entry.resource.name || entry.resource.title,
      title: entry.resource.title,
      version: entry.resource.version,
      status: entry.resource.status,
      publisher: entry.resource.publisher,
      description: entry.resource.description,
      purpose: entry.resource.purpose,
      url: entry.resource.url,
    }));

    res.json({
      total: result.total || valueSets.length,
      valueSets,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vsac/valueset/:oid
 * Get value set metadata by OID
 */
vsacRouter.get('/valueset/:oid', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'VSAC API key required',
        help: 'Get a free API key at https://uts.nlm.nih.gov/uts/',
      });
    }

    const { oid } = req.params;

    // Fetch value set by OID
    const result = await vsacFetch(`/ValueSet/${oid}`, apiKey);

    res.json({
      id: result.id,
      oid: result.identifier?.[0]?.value || result.id,
      name: result.name || result.title,
      title: result.title,
      version: result.version,
      status: result.status,
      publisher: result.publisher,
      description: result.description,
      purpose: result.purpose,
      url: result.url,
      compose: result.compose,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vsac/expand/:oid
 * Expand a value set to get all codes
 *
 * Query params:
 *   - version: Specific version (optional)
 */
vsacRouter.get('/expand/:oid', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'VSAC API key required',
        help: 'Get a free API key at https://uts.nlm.nih.gov/uts/',
      });
    }

    const { oid } = req.params;
    const { version } = req.query;

    // Build expansion URL
    let expandUrl = `/ValueSet/${oid}/$expand`;
    if (version) {
      expandUrl += `?valueSetVersion=${version}`;
    }

    const result = await vsacFetch(expandUrl, apiKey);

    // Extract expansion contains (the actual codes)
    const expansion = result.expansion || {};
    const codes = (expansion.contains || []).map(code => ({
      code: code.code,
      system: code.system,
      display: code.display,
      version: code.version,
    }));

    res.json({
      id: result.id,
      oid: result.identifier?.[0]?.value || result.id,
      name: result.name || result.title,
      title: result.title,
      version: result.version,
      expansionTimestamp: expansion.timestamp,
      totalCodes: expansion.total || codes.length,
      codes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vsac/code-system/:system
 * Look up codes in a code system
 *
 * Query params:
 *   - code: Code to look up
 */
vsacRouter.get('/code-system/:system', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'VSAC API key required',
        help: 'Get a free API key at https://uts.nlm.nih.gov/uts/',
      });
    }

    const { system } = req.params;
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Code parameter required' });
    }

    // Use CodeSystem $lookup operation
    const searchParams = new URLSearchParams({
      system,
      code,
    });

    const result = await vsacFetch(`/CodeSystem/$lookup?${searchParams}`, apiKey);

    // Extract parameters from FHIR Parameters resource
    const params = {};
    (result.parameter || []).forEach(p => {
      params[p.name] = p.valueString || p.valueCode || p.valueBoolean;
    });

    res.json({
      code,
      system,
      display: params.display,
      name: params.name,
      version: params.version,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/vsac/validate-code
 * Validate if a code is in a value set
 */
vsacRouter.post('/validate-code', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'VSAC API key required',
        help: 'Get a free API key at https://uts.nlm.nih.gov/uts/',
      });
    }

    const { valueSetOid, code, system } = req.body;

    if (!valueSetOid || !code || !system) {
      return res.status(400).json({
        error: 'valueSetOid, code, and system are required',
      });
    }

    // Use ValueSet $validate-code operation
    const searchParams = new URLSearchParams({
      code,
      system,
    });

    const result = await vsacFetch(
      `/ValueSet/${valueSetOid}/$validate-code?${searchParams}`,
      apiKey
    );

    // Extract result from FHIR Parameters
    const params = {};
    (result.parameter || []).forEach(p => {
      params[p.name] = p.valueString || p.valueCode || p.valueBoolean;
    });

    res.json({
      valid: params.result === true,
      display: params.display,
      message: params.message,
    });
  } catch (err) {
    next(err);
  }
});
