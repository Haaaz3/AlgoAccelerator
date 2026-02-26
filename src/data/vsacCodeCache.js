/**
 * VSAC Code Cache
 *
 * Local cache of VSAC value set codes fetched from the public FHIR package:
 * https://github.com/FHIR/packages/tree/master/packages/us.nlm.vsac
 *
 * This enables offline code population without requiring a VSAC API key.
 * Codes are authoritative and sourced directly from NLM's published packages.
 */

/**
 * Map FHIR system URIs to app short names
 */
function _fhirUriToAppSystem(fhirUri) {
  const mapping = {
    'http://snomed.info/sct': 'SNOMED',
    'http://www.ama-assn.org/go/cpt': 'CPT',
    'http://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets': 'HCPCS',
    'http://www.cms.gov/Medicare/Coding/ICD10': 'ICD10PCS',
    'http://hl7.org/fhir/sid/icd-10-cm': 'ICD10CM',
    'http://loinc.org': 'LOINC',
    'http://hl7.org/fhir/sid/cvx': 'CVX',
    'http://hl7.org/fhir/sid/ndc': 'NDC',
    'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
  };
  return mapping[fhirUri] || fhirUri;
}

/**
 * VSAC Code Cache - OID to codes lookup
 * Each entry: OID -> { name, codes: [{ code, display, system }] }
 */
export const VSAC_CODE_CACHE = {
  // ============================================================================
  // ENCOUNTER VALUE SETS
  // ============================================================================

  // Office Visit - OID: 2.16.840.1.113883.3.464.1003.101.12.1001
  '2.16.840.1.113883.3.464.1003.101.12.1001': {
    name: 'Office Visit',
    codes: [
      { code: '185349003', display: 'Encounter for check up (procedure)', system: 'SNOMED' },
      { code: '185463005', display: 'Visit out of hours (procedure)', system: 'SNOMED' },
      { code: '185464004', display: 'Out of hours visit - not night visit (procedure)', system: 'SNOMED' },
      { code: '185465003', display: 'Weekend visit (procedure)', system: 'SNOMED' },
      { code: '3391000175108', display: 'Office visit for pediatric care and assessment (procedure)', system: 'SNOMED' },
      { code: '439740005', display: 'Postoperative follow-up visit (procedure)', system: 'SNOMED' },
      { code: '99202', display: 'Office or other outpatient visit for new patient evaluation (straightforward)', system: 'CPT' },
      { code: '99203', display: 'Office or other outpatient visit for new patient evaluation (low complexity)', system: 'CPT' },
      { code: '99204', display: 'Office or other outpatient visit for new patient evaluation (moderate complexity)', system: 'CPT' },
      { code: '99205', display: 'Office or other outpatient visit for new patient evaluation (high complexity)', system: 'CPT' },
      { code: '99212', display: 'Office or other outpatient visit for established patient (straightforward)', system: 'CPT' },
      { code: '99213', display: 'Office or other outpatient visit for established patient (low complexity)', system: 'CPT' },
      { code: '99214', display: 'Office or other outpatient visit for established patient (moderate complexity)', system: 'CPT' },
      { code: '99215', display: 'Office or other outpatient visit for established patient (high complexity)', system: 'CPT' },
    ],
  },

  // Home Healthcare Services - OID: 2.16.840.1.113883.3.464.1003.101.12.1016
  '2.16.840.1.113883.3.464.1003.101.12.1016': {
    name: 'Home Healthcare Services',
    codes: [
      { code: '185460008', display: 'Home visit request by patient (procedure)', system: 'SNOMED' },
      { code: '185462000', display: 'Home visit request by relative (procedure)', system: 'SNOMED' },
      { code: '185466002', display: 'Home visit for urgent condition (procedure)', system: 'SNOMED' },
      { code: '185467006', display: 'Home visit for acute condition (procedure)', system: 'SNOMED' },
      { code: '185468001', display: 'Home visit for chronic condition (procedure)', system: 'SNOMED' },
      { code: '185470005', display: 'Home visit elderly assessment (procedure)', system: 'SNOMED' },
      { code: '225929007', display: 'Joint home visit (procedure)', system: 'SNOMED' },
      { code: '315205008', display: 'Bank holiday home visit (procedure)', system: 'SNOMED' },
      { code: '439708006', display: 'Home visit (procedure)', system: 'SNOMED' },
      { code: '698704008', display: 'Home visit for rheumatology service (procedure)', system: 'SNOMED' },
      { code: '704126008', display: 'Home visit for anticoagulant drug monitoring (procedure)', system: 'SNOMED' },
      { code: '99341', display: 'Home or residence visit for evaluation and management of new patient', system: 'CPT' },
      { code: '99342', display: 'Home or residence visit for evaluation and management of new patient', system: 'CPT' },
      { code: '99344', display: 'Home or residence visit for evaluation and management of new patient', system: 'CPT' },
      { code: '99345', display: 'Home or residence visit for evaluation and management of new patient', system: 'CPT' },
      { code: '99347', display: 'Home or residence visit for evaluation and management of established patient', system: 'CPT' },
      { code: '99348', display: 'Home or residence visit for evaluation and management of established patient', system: 'CPT' },
      { code: '99349', display: 'Home or residence visit for evaluation and management of established patient', system: 'CPT' },
      { code: '99350', display: 'Home or residence visit for evaluation and management of established patient', system: 'CPT' },
    ],
  },

  // Preventive Care Services - Established Office Visit, 18 and Up - OID: 2.16.840.1.113883.3.464.1003.101.12.1027
  '2.16.840.1.113883.3.464.1003.101.12.1027': {
    name: 'Preventive Care Services - Established Office Visit, 18 and Up',
    codes: [
      { code: '99411', display: 'Preventive medicine counseling and/or risk factor reduction intervention(s) provided to individuals in a group setting (separate procedure); approximately 30 minutes', system: 'CPT' },
      { code: '99412', display: 'Preventive medicine counseling and/or risk factor reduction intervention(s) provided to individuals in a group setting (separate procedure); approximately 60 minutes', system: 'CPT' },
    ],
  },

  // Annual Wellness Visit - OID: 2.16.840.1.113883.3.526.3.1240
  '2.16.840.1.113883.3.526.3.1240': {
    name: 'Annual Wellness Visit',
    codes: [
      { code: '444971000124105', display: 'Annual wellness visit (procedure)', system: 'SNOMED' },
      { code: '456201000124103', display: 'Medicare annual wellness visit (procedure)', system: 'SNOMED' },
      { code: '86013001', display: 'Periodic reevaluation and management of healthy individual (procedure)', system: 'SNOMED' },
      { code: '866149003', display: 'Annual visit (procedure)', system: 'SNOMED' },
      { code: '90526000', display: 'Initial evaluation and management of healthy individual (procedure)', system: 'SNOMED' },
      { code: 'G0402', display: 'Initial preventive physical examination; face-to-face visit, services limited to new beneficiary during the first 12 months of medicare enrollment', system: 'HCPCS' },
      { code: 'G0438', display: 'Annual wellness visit; includes a personalized prevention plan of service (pps), initial visit', system: 'HCPCS' },
      { code: 'G0439', display: 'Annual wellness visit, includes a personalized prevention plan of service (pps), subsequent visit', system: 'HCPCS' },
    ],
  },

  // Online Assessments - OID: 2.16.840.1.113883.3.464.1003.101.12.1089
  '2.16.840.1.113883.3.464.1003.101.12.1089': {
    name: 'Online Assessments',
    codes: [
      { code: '98970', display: 'Nonphysician qualified health care professional online digital assessment and management, for an established patient, for up to 7 days, cumulative time during the 7 days; 5-10 minutes', system: 'CPT' },
      { code: '98971', display: 'Nonphysician qualified health care professional online digital assessment and management, for an established patient, for up to 7 days, cumulative time during the 7 days; 11-20 minutes', system: 'CPT' },
      { code: '98972', display: 'Nonphysician qualified health care professional online digital assessment and management, for an established patient, for up to 7 days, cumulative time during the 7 days; 21 or more minutes', system: 'CPT' },
      { code: '98980', display: 'Remote therapeutic monitoring treatment management services, physician or other qualified health care professional time in a calendar month requiring at least one interactive communication with the patient or caregiver during the calendar month; first 20 minutes', system: 'CPT' },
      { code: '98981', display: 'Remote therapeutic monitoring treatment management services, physician or other qualified health care professional time in a calendar month requiring at least one interactive communication with the patient or caregiver during the calendar month; each additional 20 minutes', system: 'CPT' },
      { code: '99421', display: 'Online digital evaluation and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 5-10 minutes', system: 'CPT' },
      { code: '99422', display: 'Online digital evaluation and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 11-20 minutes', system: 'CPT' },
      { code: '99423', display: 'Online digital evaluation and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 21 or more minutes', system: 'CPT' },
      { code: '99457', display: 'Remote physiologic monitoring treatment management services, clinical staff/physician/other qualified health care professional time in a calendar month requiring interactive communication with the patient/caregiver during the month; first 20 minutes', system: 'CPT' },
      { code: '99458', display: 'Remote physiologic monitoring treatment management services, clinical staff/physician/other qualified health care professional time in a calendar month requiring interactive communication with the patient/caregiver during the month; each additional 20 minutes', system: 'CPT' },
      { code: 'G0071', display: 'Payment for communication technology-based services for 5 minutes or more of a virtual (non-face-to-face) communication between an rural health clinic (rhc) or federally qualified health center (fqhc) practitioner and rhc or fqhc patient', system: 'HCPCS' },
      { code: 'G2010', display: 'Remote evaluation of recorded video and/or images submitted by an established patient (e.g., store and forward), including interpretation with follow-up with the patient within 24 business hours', system: 'HCPCS' },
      { code: 'G2250', display: 'Remote assessment of recorded video and/or images submitted by an established patient (e.g., store and forward), including interpretation with follow-up with the patient within 24 business hours', system: 'HCPCS' },
      { code: 'G2251', display: 'Brief communication technology-based service, e.g. virtual check-in, by a qualified health care professional who cannot report evaluation and management services, provided to an established patient; 5-10 minutes of clinical discussion', system: 'HCPCS' },
      { code: 'G2252', display: 'Brief communication technology-based service, e.g. virtual check-in, by a physician or other qualified health care professional who can report evaluation and management services, provided to an established patient; 11-20 minutes of medical discussion', system: 'HCPCS' },
    ],
  },

  // Telephone Visits - OID: 2.16.840.1.113883.3.464.1003.101.12.1080
  '2.16.840.1.113883.3.464.1003.101.12.1080': {
    name: 'Telephone Visits',
    codes: [
      { code: '185317003', display: 'Telephone encounter (procedure)', system: 'SNOMED' },
      { code: '314849005', display: 'Telephone contact by consultant (procedure)', system: 'SNOMED' },
      { code: '386472008', display: 'Telephone consultation (procedure)', system: 'SNOMED' },
      { code: '386473003', display: 'Telephone follow-up (procedure)', system: 'SNOMED' },
      { code: '401267002', display: 'Telephone triage encounter (procedure)', system: 'SNOMED' },
      { code: '98008', display: 'Synchronous audio-only visit for new patient evaluation', system: 'CPT' },
      { code: '98009', display: 'Synchronous audio-only visit for new patient evaluation', system: 'CPT' },
      { code: '98010', display: 'Synchronous audio-only visit for new patient evaluation', system: 'CPT' },
      { code: '98011', display: 'Synchronous audio-only visit for new patient evaluation', system: 'CPT' },
      { code: '98012', display: 'Synchronous audio-only visit for established patient', system: 'CPT' },
      { code: '98013', display: 'Synchronous audio-only visit for established patient', system: 'CPT' },
      { code: '98014', display: 'Synchronous audio-only visit for established patient', system: 'CPT' },
      { code: '98015', display: 'Synchronous audio-only visit for established patient', system: 'CPT' },
      { code: '98966', display: 'Telephone assessment by nonphysician qualified healthcare professional', system: 'CPT' },
      { code: '98967', display: 'Telephone assessment by nonphysician qualified healthcare professional', system: 'CPT' },
      { code: '98968', display: 'Telephone assessment by nonphysician qualified healthcare professional', system: 'CPT' },
    ],
  },

  // Preventive Care Services - Initial Office Visit, 0 to 17 - OID: 2.16.840.1.113883.3.464.1003.101.12.1022
  '2.16.840.1.113883.3.464.1003.101.12.1022': {
    name: 'Preventive Care Services - Initial Office Visit, 0 to 17',
    codes: [
      { code: '99381', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; infant (age younger than 1 year)', system: 'CPT' },
      { code: '99382', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; early childhood (age 1 through 4 years)', system: 'CPT' },
      { code: '99383', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; late childhood (age 5 through 11 years)', system: 'CPT' },
      { code: '99384', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; adolescent (age 12 through 17 years)', system: 'CPT' },
    ],
  },

  // Preventive Care Services - Initial Office Visit, 18 and Up - OID: 2.16.840.1.113883.3.464.1003.101.12.1023
  '2.16.840.1.113883.3.464.1003.101.12.1023': {
    name: 'Preventive Care Services - Initial Office Visit, 18 and Up',
    codes: [
      { code: '99385', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; 18-39 years', system: 'CPT' },
      { code: '99386', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; 40-64 years', system: 'CPT' },
      { code: '99387', display: 'Initial comprehensive preventive medicine evaluation and management, new patient; 65 years and older', system: 'CPT' },
    ],
  },

  // Preventive Care Services - Established Office Visit, 0 to 17 - OID: 2.16.840.1.113883.3.464.1003.101.12.1024
  '2.16.840.1.113883.3.464.1003.101.12.1024': {
    name: 'Preventive Care Services - Established Office Visit, 0 to 17',
    codes: [
      { code: '99391', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; infant (age younger than 1 year)', system: 'CPT' },
      { code: '99392', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; early childhood (age 1 through 4 years)', system: 'CPT' },
      { code: '99393', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; late childhood (age 5 through 11 years)', system: 'CPT' },
      { code: '99394', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; adolescent (age 12 through 17 years)', system: 'CPT' },
    ],
  },

  // Preventive Care Services - Established Office Visit, 18-64 - OID: 2.16.840.1.113883.3.464.1003.101.12.1025
  '2.16.840.1.113883.3.464.1003.101.12.1025': {
    name: 'Preventive Care Services - Established Office Visit, 18-64',
    codes: [
      { code: '99395', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; 18-39 years', system: 'CPT' },
      { code: '99396', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; 40-64 years', system: 'CPT' },
      { code: '99397', display: 'Periodic comprehensive preventive medicine reevaluation, established patient; 65 years and older', system: 'CPT' },
    ],
  },

  // ============================================================================
  // HOSPICE AND PALLIATIVE CARE VALUE SETS
  // ============================================================================

  // Hospice Care Ambulatory - OID: 2.16.840.1.113762.1.4.1108.15
  '2.16.840.1.113762.1.4.1108.15': {
    name: 'Hospice Care Ambulatory',
    codes: [
      { code: '170935008', display: 'Full care by hospice (finding)', system: 'SNOMED' },
      { code: '170936009', display: 'Shared care - hospice and general practitioner (finding)', system: 'SNOMED' },
      { code: '385763009', display: 'Hospice care (regime/therapy)', system: 'SNOMED' },
    ],
  },

  // Palliative Care Encounter - OID: 2.16.840.1.113883.3.464.1003.1167
  '2.16.840.1.113883.3.464.1003.1167': {
    name: 'Palliative Care Encounter',
    codes: [
      { code: '305686008', display: 'Seen by palliative care physician (finding)', system: 'SNOMED' },
      { code: '305824005', display: 'Seen by palliative care medicine service (finding)', system: 'SNOMED' },
      { code: '441874000', display: 'Seen by palliative care service (finding)', system: 'SNOMED' },
      { code: 'Z51.5', display: 'Encounter for palliative care', system: 'ICD10CM' },
    ],
  },

  // ============================================================================
  // BREAST CANCER SCREENING VALUE SETS
  // ============================================================================

  // Unilateral Mastectomy Left - OID: 2.16.840.1.113883.3.464.1003.198.12.1133
  '2.16.840.1.113883.3.464.1003.198.12.1133': {
    name: 'Unilateral Mastectomy Left',
    codes: [
      { code: '0HTU0ZZ', display: 'Resection of Left Breast, Open Approach', system: 'ICD10PCS' },
      { code: '428571003', display: 'Excision of left breast (procedure)', system: 'SNOMED' },
      { code: '451211000124109', display: 'Prophylactic mastectomy of left breast (procedure)', system: 'SNOMED' },
      { code: '726429001', display: 'Radical mastectomy of left breast (procedure)', system: 'SNOMED' },
      { code: '726435001', display: 'Subcutaneous mastectomy of left breast (procedure)', system: 'SNOMED' },
      { code: '726437009', display: 'Modified radical mastectomy of left breast (procedure)', system: 'SNOMED' },
      { code: '741009001', display: 'Simple mastectomy of left breast (procedure)', system: 'SNOMED' },
      { code: '741018004', display: 'Subcutaneous mastectomy of left breast with prosthetic implant (procedure)', system: 'SNOMED' },
      { code: '836437004', display: 'Simple mastectomy of left breast using robotic assistance (procedure)', system: 'SNOMED' },
    ],
  },

  // Unilateral Mastectomy Right - OID: 2.16.840.1.113883.3.464.1003.198.12.1134
  '2.16.840.1.113883.3.464.1003.198.12.1134': {
    name: 'Unilateral Mastectomy Right',
    codes: [
      { code: '0HTT0ZZ', display: 'Resection of Right Breast, Open Approach', system: 'ICD10PCS' },
      { code: '429400009', display: 'Excision of right breast (procedure)', system: 'SNOMED' },
      { code: '451201000124106', display: 'Prophylactic mastectomy of right breast (procedure)', system: 'SNOMED' },
      { code: '726430006', display: 'Radical mastectomy of right breast (procedure)', system: 'SNOMED' },
      { code: '726434002', display: 'Subcutaneous mastectomy of right breast (procedure)', system: 'SNOMED' },
      { code: '726436000', display: 'Modified radical mastectomy of right breast (procedure)', system: 'SNOMED' },
      { code: '741010006', display: 'Simple mastectomy of right breast (procedure)', system: 'SNOMED' },
      { code: '741019007', display: 'Subcutaneous mastectomy of right breast with prosthetic implant (procedure)', system: 'SNOMED' },
      { code: '836435007', display: 'Simple mastectomy of right breast using robotic assistance (procedure)', system: 'SNOMED' },
    ],
  },

  // ============================================================================
  // CONDITION VALUE SETS
  // ============================================================================

  // Essential Hypertension - OID: 2.16.840.1.113883.3.464.1003.104.12.1011
  '2.16.840.1.113883.3.464.1003.104.12.1011': {
    name: 'Essential Hypertension',
    codes: [
      { code: '1201005', display: 'Benign essential hypertension (disorder)', system: 'SNOMED' },
      { code: '18416000', display: 'Essential hypertension complicating AND/OR reason for care during childbirth (disorder)', system: 'SNOMED' },
      { code: '19769006', display: 'High-renin essential hypertension (disorder)', system: 'SNOMED' },
      { code: '23717007', display: 'Benign essential hypertension complicating AND/OR reason for care during pregnancy (disorder)', system: 'SNOMED' },
      { code: '35303009', display: 'Benign essential hypertension complicating AND/OR reason for care during puerperium (disorder)', system: 'SNOMED' },
      { code: '371125006', display: 'Labile essential hypertension (disorder)', system: 'SNOMED' },
      { code: '40511000119107', display: 'Postpartum pre-existing essential hypertension (disorder)', system: 'SNOMED' },
      { code: '429457004', display: 'Systolic essential hypertension (disorder)', system: 'SNOMED' },
      { code: '46481004', display: 'Low-renin essential hypertension (disorder)', system: 'SNOMED' },
      { code: '59621000', display: 'Essential hypertension (disorder)', system: 'SNOMED' },
      { code: '63287004', display: 'Benign essential hypertension in obstetric context (disorder)', system: 'SNOMED' },
      { code: '71874008', display: 'Benign essential hypertension complicating AND/OR reason for care during childbirth (disorder)', system: 'SNOMED' },
      { code: '72022006', display: 'Essential hypertension in obstetric context (disorder)', system: 'SNOMED' },
      { code: '78808002', display: 'Essential hypertension complicating AND/OR reason for care during pregnancy (disorder)', system: 'SNOMED' },
      { code: '78975002', display: 'Malignant essential hypertension (disorder)', system: 'SNOMED' },
      { code: '9901000', display: 'Essential hypertension complicating AND/OR reason for care during puerperium (disorder)', system: 'SNOMED' },
      { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD10CM' },
    ],
  },
};

/**
 * Hydrate codes from cache for a given OID
 * @param {string} oid - The OID to look up
 * @returns {Array|null} - Array of codes or null if not found
 */
export function hydrateCodesFromCache(oid) {
  if (!oid) return null;

  const cached = VSAC_CODE_CACHE[oid];
  if (cached && cached.codes && cached.codes.length > 0) {
    return cached.codes;
  }

  return null;
}

/**
 * Get value set name from cache
 * @param {string} oid - The OID to look up
 * @returns {string|null} - Value set name or null if not found
 */
export function getValueSetNameFromCache(oid) {
  if (!oid) return null;

  const cached = VSAC_CODE_CACHE[oid];
  return cached ? cached.name : null;
}

/**
 * Check if an OID is in the cache
 * @param {string} oid - The OID to check
 * @returns {boolean}
 */
export function isOIDInCache(oid) {
  return oid && oid in VSAC_CODE_CACHE;
}

/**
 * Get all cached OIDs
 * @returns {string[]}
 */
export function getAllCachedOIDs() {
  return Object.keys(VSAC_CODE_CACHE);
}

/**
 * Get cache statistics
 * @returns {{ oidCount: number, totalCodes: number }}
 */
export function getCacheStats() {
  const oids = Object.keys(VSAC_CODE_CACHE);
  let totalCodes = 0;

  for (const oid of oids) {
    totalCodes += VSAC_CODE_CACHE[oid].codes?.length || 0;
  }

  return {
    oidCount: oids.length,
    totalCodes,
  };
}
