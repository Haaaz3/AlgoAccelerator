/**
 * VSAC FHIR API Service
 *
 * Fetches value set expansions from the VSAC FHIR Terminology Service.
 * Uses the Vite dev proxy at /vsac-api to avoid CORS issues.
 * Requires a UMLS API key (free from https://uts.nlm.nih.gov/uts/).
 */

import { getCodeSystemDisplayName } from '../constants/fhirCodeSystems';

const VSAC_BASE = '/vsac-api/fhir/ValueSet';

/**
 * Fetch expanded codes for a value set by OID.
 *
 * @param {string} oid - The value set OID (e.g., "2.16.840.1.113883.3.464.1003.108.12.1020")
 * @param {string} apiKey - UMLS API key
 * @returns {Promise<{ name: string, title: string, codes: Array<{ code: string, display: string, system: string }>, total: number }>}
 */
export async function fetchValueSetExpansion(oid, apiKey) {
  if (!oid) throw new Error('OID is required');
  if (!apiKey) throw new Error('VSAC API key is required. Set it in Settings.');

  // Clean OID - strip any URI prefix if present
  const cleanOid = oid.replace(/^urn:oid:/, '').replace(/^https?:\/\/.*\//, '').trim();

  // Validate OID format (basic check)
  if (!/^\d+(\.\d+)+$/.test(cleanOid)) {
    throw new Error(`Invalid OID format: "${cleanOid}". Expected format like 2.16.840.1.113883.3.464.1003.108.12.1020`);
  }

  const url = `${VSAC_BASE}/${encodeURIComponent(cleanOid)}/$expand`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${btoa(`apikey:${apiKey}`)}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid VSAC API key. Check your UMLS API key in Settings.');
    }
    if (response.status === 404) {
      throw new Error(`Value set not found in VSAC for OID: ${cleanOid}`);
    }
    if (response.status === 429) {
      throw new Error('VSAC rate limit exceeded. Wait a moment and try again.');
    }
    throw new Error(`VSAC API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Parse the FHIR expansion response
  const expansion = data.expansion;
  if (!expansion || !expansion.contains || expansion.contains.length === 0) {
    throw new Error(`Value set ${cleanOid} returned empty expansion. It may be intensional-only or retired.`);
  }

  // Map FHIR codes to app format
  const codes = expansion.contains.map(entry => ({
    code: entry.code,
    display: entry.display || '',
    system: fhirUriToAppSystem(entry.system),
  }));

  return {
    name: data.name || '',
    title: data.title || data.name || '',
    version: expansion.timestamp || data.version || '',
    codes,
    total: expansion.total || codes.length,
  };
}

/**
 * Map a FHIR system URI to the app's short code system name.
 * Uses the existing getCodeSystemDisplayName from fhirCodeSystems.js,
 * but normalizes further for the app's code format.
 *
 * The app stores codes with system values like "CPT", "ICD10", "SNOMED", etc.
 */
function fhirUriToAppSystem(fhirUri) {
  if (!fhirUri) return 'OTHER';

  // Direct mapping for the most common systems
  const FHIR_TO_APP = {
    'http://hl7.org/fhir/sid/icd-10-cm': 'ICD10',
    'http://snomed.info/sct': 'SNOMED',
    'http://www.ama-assn.org/go/cpt': 'CPT',
    'https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets': 'HCPCS',
    'http://loinc.org': 'LOINC',
    'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
    'http://hl7.org/fhir/sid/cvx': 'CVX',
    'http://hl7.org/fhir/sid/ndc': 'NDC',
    'http://www.cms.gov/Medicare/Coding/ICD10': 'ICD10',
  };

  return FHIR_TO_APP[fhirUri] || getCodeSystemDisplayName(fhirUri);
}

/**
 * Fetch multiple value set expansions in sequence.
 * Respects VSAC rate limit of 20 requests/second.
 *
 * @param {Array<{ oid: string, name: string }>} valueSets - Array of value sets to fetch
 * @param {string} apiKey - UMLS API key
 * @param {function} onProgress - Called with (completed, total, currentName) for progress tracking
 * @returns {Promise<Map<string, { codes: Array, error?: string }>>} - Map of OID → result
 */
export async function fetchMultipleValueSets(valueSets, apiKey, onProgress) {
  const results = new Map();

  for (let i = 0; i < valueSets.length; i++) {
    const vs = valueSets[i];
    if (onProgress) onProgress(i, valueSets.length, vs.name || vs.oid);

    try {
      const result = await fetchValueSetExpansion(vs.oid, apiKey);
      results.set(vs.oid, { codes: result.codes, name: result.title || result.name });
    } catch (err) {
      results.set(vs.oid, { codes: [], error: err.message });
    }

    // Small delay to respect rate limits (50ms = max 20/sec)
    if (i < valueSets.length - 1) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  if (onProgress) onProgress(valueSets.length, valueSets.length, 'Done');
  return results;
}
