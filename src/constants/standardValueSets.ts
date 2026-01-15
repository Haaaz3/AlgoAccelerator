/**
 * Standard Value Sets for Clinical Quality Measures
 *
 * These value sets are sourced from VSAC (Value Set Authority Center) and
 * eCQM specifications. OIDs reference the authoritative published value sets.
 *
 * When developing or validating measures, these complete code lists ensure
 * accurate patient classification.
 */

import { CPT, HCPCS, ICD10CM, SNOMEDCT, LOINC } from './fhirCodeSystems';

export interface StandardValueSet {
  id: string;
  oid: string;
  name: string;
  version?: string;
  codes: Array<{
    code: string;
    system: string;
    display: string;
  }>;
}

// =============================================================================
// CRC SCREENING MEASURE (CMS130) VALUE SETS
// =============================================================================

/**
 * Colonoscopy - OID: 2.16.840.1.113883.3.464.1003.108.12.1020
 * Includes all CPT and HCPCS codes for colonoscopy procedures
 */
export const COLONOSCOPY_VALUE_SET: StandardValueSet = {
  id: 'colonoscopy',
  oid: '2.16.840.1.113883.3.464.1003.108.12.1020',
  name: 'Colonoscopy',
  codes: [
    // CPT Colonoscopy codes
    { code: '44388', system: CPT, display: 'Colonoscopy through stoma; diagnostic' },
    { code: '44389', system: CPT, display: 'Colonoscopy through stoma; with biopsy' },
    { code: '44390', system: CPT, display: 'Colonoscopy through stoma; with removal of foreign body' },
    { code: '44391', system: CPT, display: 'Colonoscopy through stoma; with control of bleeding' },
    { code: '44392', system: CPT, display: 'Colonoscopy through stoma; with removal of tumor(s)' },
    { code: '44394', system: CPT, display: 'Colonoscopy through stoma; with snare removal' },
    { code: '44401', system: CPT, display: 'Colonoscopy through stoma; with ablation' },
    { code: '44402', system: CPT, display: 'Colonoscopy through stoma; with stent placement' },
    { code: '44403', system: CPT, display: 'Colonoscopy through stoma; with resection' },
    { code: '44404', system: CPT, display: 'Colonoscopy through stoma; with injection' },
    { code: '44405', system: CPT, display: 'Colonoscopy through stoma; with transendoscopic balloon dilation' },
    { code: '44406', system: CPT, display: 'Colonoscopy through stoma; with band ligation' },
    { code: '44407', system: CPT, display: 'Colonoscopy through stoma; with decompression' },
    { code: '44408', system: CPT, display: 'Colonoscopy through stoma; with placement of decompression tube' },
    { code: '45378', system: CPT, display: 'Colonoscopy, flexible; diagnostic' },
    { code: '45379', system: CPT, display: 'Colonoscopy, flexible; with removal of foreign body' },
    { code: '45380', system: CPT, display: 'Colonoscopy, flexible; with biopsy' },
    { code: '45381', system: CPT, display: 'Colonoscopy, flexible; with directed submucosal injection' },
    { code: '45382', system: CPT, display: 'Colonoscopy, flexible; with control of bleeding' },
    { code: '45383', system: CPT, display: 'Colonoscopy, flexible; with ablation of tumor(s)' },
    { code: '45384', system: CPT, display: 'Colonoscopy, flexible; with removal of tumor(s) by hot biopsy' },
    { code: '45385', system: CPT, display: 'Colonoscopy, flexible; with removal of tumor(s) by snare technique' },
    { code: '45386', system: CPT, display: 'Colonoscopy, flexible; with transendoscopic balloon dilation' },
    { code: '45388', system: CPT, display: 'Colonoscopy, flexible; with ablation of tumor(s) or polyp(s)' },
    { code: '45389', system: CPT, display: 'Colonoscopy, flexible; with stent placement' },
    { code: '45390', system: CPT, display: 'Colonoscopy, flexible; with resection' },
    { code: '45391', system: CPT, display: 'Colonoscopy, flexible; with endoscopic ultrasound' },
    { code: '45392', system: CPT, display: 'Colonoscopy, flexible; with transendoscopic ultrasound guided needle aspiration' },
    { code: '45393', system: CPT, display: 'Colonoscopy, flexible; with decompression' },
    { code: '45398', system: CPT, display: 'Colonoscopy, flexible; with band ligation' },
    // HCPCS Screening colonoscopy codes
    { code: 'G0105', system: HCPCS, display: 'Colorectal cancer screening; colonoscopy on individual at high risk' },
    { code: 'G0121', system: HCPCS, display: 'Colorectal cancer screening; colonoscopy on individual not meeting criteria for high risk' },
  ],
};

/**
 * Fecal Occult Blood Test (FOBT) - OID: 2.16.840.1.113883.3.464.1003.198.12.1011
 */
export const FOBT_VALUE_SET: StandardValueSet = {
  id: 'fobt',
  oid: '2.16.840.1.113883.3.464.1003.198.12.1011',
  name: 'Fecal Occult Blood Test (FOBT)',
  codes: [
    // CPT codes
    { code: '82270', system: CPT, display: 'Blood, occult, by peroxidase activity, feces, consecutive collected specimens' },
    { code: '82274', system: CPT, display: 'Blood, occult, by fecal hemoglobin determination by immunoassay' },
    // HCPCS
    { code: 'G0328', system: HCPCS, display: 'Colorectal cancer screening; fecal occult blood test, immunoassay, 1-3 simultaneous' },
    // LOINC
    { code: '12503-9', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --4th specimen' },
    { code: '12504-7', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --5th specimen' },
    { code: '14563-1', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --1st specimen' },
    { code: '14564-9', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --2nd specimen' },
    { code: '14565-6', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --3rd specimen' },
    { code: '2335-8', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool' },
    { code: '27396-1', system: LOINC, display: 'Hemoglobin.gastrointestinal [Mass/mass] in Stool' },
    { code: '27401-9', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --6th specimen' },
    { code: '27925-7', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --7th specimen' },
    { code: '27926-5', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool --8th specimen' },
    { code: '29771-3', system: LOINC, display: 'Hemoglobin.gastrointestinal.lower [Presence] in Stool by Immunoassay' },
    { code: '56490-6', system: LOINC, display: 'Hemoglobin.gastrointestinal.lower [Presence] in Stool by Immune fecal occult blood test' },
    { code: '56491-4', system: LOINC, display: 'Hemoglobin.gastrointestinal.lower [Mass/volume] in Stool by Immunoassay' },
    { code: '57905-2', system: LOINC, display: 'Hemoglobin.gastrointestinal.lower [Presence] in Stool by Guaiac' },
    { code: '58453-2', system: LOINC, display: 'Hemoglobin.gastrointestinal.lower [Mass/volume] in Stool by Guaiac' },
    { code: '80372-6', system: LOINC, display: 'Hemoglobin.gastrointestinal [Presence] in Stool by Rapid immunoassay' },
  ],
};

/**
 * FIT-DNA Test (Cologuard) - OID: 2.16.840.1.113883.3.464.1003.108.12.1039
 */
export const FIT_DNA_VALUE_SET: StandardValueSet = {
  id: 'fit-dna',
  oid: '2.16.840.1.113883.3.464.1003.108.12.1039',
  name: 'FIT-DNA (Stool DNA)',
  codes: [
    { code: '81528', system: CPT, display: 'Oncology (colorectal) screening, quantitative real-time target and signal amplification' },
    { code: 'G0464', system: HCPCS, display: 'Colorectal cancer screening; stool-based DNA and fecal occult hemoglobin' },
  ],
};

/**
 * Flexible Sigmoidoscopy - OID: 2.16.840.1.113883.3.464.1003.198.12.1010
 */
export const FLEXIBLE_SIGMOIDOSCOPY_VALUE_SET: StandardValueSet = {
  id: 'flexible-sigmoidoscopy',
  oid: '2.16.840.1.113883.3.464.1003.198.12.1010',
  name: 'Flexible Sigmoidoscopy',
  codes: [
    { code: '45330', system: CPT, display: 'Sigmoidoscopy, flexible; diagnostic' },
    { code: '45331', system: CPT, display: 'Sigmoidoscopy, flexible; with biopsy' },
    { code: '45332', system: CPT, display: 'Sigmoidoscopy, flexible; with removal of foreign body' },
    { code: '45333', system: CPT, display: 'Sigmoidoscopy, flexible; with removal of tumor(s) by hot biopsy' },
    { code: '45334', system: CPT, display: 'Sigmoidoscopy, flexible; with control of bleeding' },
    { code: '45335', system: CPT, display: 'Sigmoidoscopy, flexible; with directed submucosal injection' },
    { code: '45337', system: CPT, display: 'Sigmoidoscopy, flexible; with decompression' },
    { code: '45338', system: CPT, display: 'Sigmoidoscopy, flexible; with removal of tumor(s) by snare technique' },
    { code: '45339', system: CPT, display: 'Sigmoidoscopy, flexible; with ablation of tumor(s)' },
    { code: '45340', system: CPT, display: 'Sigmoidoscopy, flexible; with transendoscopic balloon dilation' },
    { code: '45341', system: CPT, display: 'Sigmoidoscopy, flexible; with endoscopic ultrasound' },
    { code: '45342', system: CPT, display: 'Sigmoidoscopy, flexible; with transendoscopic ultrasound guided needle aspiration' },
    { code: '45346', system: CPT, display: 'Sigmoidoscopy, flexible; with ablation of tumor(s)' },
    { code: '45347', system: CPT, display: 'Sigmoidoscopy, flexible; with placement of endoscopic stent' },
    { code: '45349', system: CPT, display: 'Sigmoidoscopy, flexible; with resection' },
    { code: '45350', system: CPT, display: 'Sigmoidoscopy, flexible; with band ligation' },
    { code: 'G0104', system: HCPCS, display: 'Colorectal cancer screening; flexible sigmoidoscopy' },
  ],
};

/**
 * CT Colonography - OID: 2.16.840.1.113883.3.464.1003.108.12.1038
 */
export const CT_COLONOGRAPHY_VALUE_SET: StandardValueSet = {
  id: 'ct-colonography',
  oid: '2.16.840.1.113883.3.464.1003.108.12.1038',
  name: 'CT Colonography',
  codes: [
    { code: '74261', system: CPT, display: 'CT colonography, diagnostic, without contrast' },
    { code: '74262', system: CPT, display: 'CT colonography, diagnostic, with contrast' },
    { code: '74263', system: CPT, display: 'CT colonography, screening' },
  ],
};

// =============================================================================
// CRC SCREENING EXCLUSION VALUE SETS
// =============================================================================

/**
 * Malignant Neoplasm of Colon - OID: 2.16.840.1.113883.3.464.1003.108.12.1001
 */
export const COLORECTAL_CANCER_VALUE_SET: StandardValueSet = {
  id: 'colorectal-cancer',
  oid: '2.16.840.1.113883.3.464.1003.108.12.1001',
  name: 'Malignant Neoplasm of Colon',
  codes: [
    { code: 'C18.0', system: ICD10CM, display: 'Malignant neoplasm of cecum' },
    { code: 'C18.1', system: ICD10CM, display: 'Malignant neoplasm of appendix' },
    { code: 'C18.2', system: ICD10CM, display: 'Malignant neoplasm of ascending colon' },
    { code: 'C18.3', system: ICD10CM, display: 'Malignant neoplasm of hepatic flexure' },
    { code: 'C18.4', system: ICD10CM, display: 'Malignant neoplasm of transverse colon' },
    { code: 'C18.5', system: ICD10CM, display: 'Malignant neoplasm of splenic flexure' },
    { code: 'C18.6', system: ICD10CM, display: 'Malignant neoplasm of descending colon' },
    { code: 'C18.7', system: ICD10CM, display: 'Malignant neoplasm of sigmoid colon' },
    { code: 'C18.8', system: ICD10CM, display: 'Malignant neoplasm of overlapping sites of colon' },
    { code: 'C18.9', system: ICD10CM, display: 'Malignant neoplasm of colon, unspecified' },
    { code: 'C19', system: ICD10CM, display: 'Malignant neoplasm of rectosigmoid junction' },
    { code: 'C20', system: ICD10CM, display: 'Malignant neoplasm of rectum' },
    { code: 'C21.0', system: ICD10CM, display: 'Malignant neoplasm of anus, unspecified' },
    { code: 'C21.1', system: ICD10CM, display: 'Malignant neoplasm of anal canal' },
    { code: 'C21.2', system: ICD10CM, display: 'Malignant neoplasm of cloacogenic zone' },
    { code: 'C21.8', system: ICD10CM, display: 'Malignant neoplasm of overlapping sites of rectum, anus and anal canal' },
    { code: 'Z85.038', system: ICD10CM, display: 'Personal history of other malignant neoplasm of large intestine' },
    { code: 'Z85.048', system: ICD10CM, display: 'Personal history of other malignant neoplasm of rectum, rectosigmoid junction, and anus' },
  ],
};

/**
 * Total Colectomy - OID: 2.16.840.1.113883.3.464.1003.198.12.1019
 */
export const TOTAL_COLECTOMY_VALUE_SET: StandardValueSet = {
  id: 'total-colectomy',
  oid: '2.16.840.1.113883.3.464.1003.198.12.1019',
  name: 'Total Colectomy',
  codes: [
    { code: '44150', system: CPT, display: 'Colectomy, total, abdominal, without proctectomy' },
    { code: '44151', system: CPT, display: 'Colectomy, total, abdominal, with proctectomy' },
    { code: '44155', system: CPT, display: 'Colectomy, total, abdominal, with proctectomy; with ileostomy' },
    { code: '44156', system: CPT, display: 'Colectomy, total, abdominal, with proctectomy; with creation of continent ileostomy' },
    { code: '44157', system: CPT, display: 'Colectomy, total, abdominal, with proctectomy; with ileoanal anastomosis' },
    { code: '44158', system: CPT, display: 'Colectomy, total, abdominal, with proctectomy; with ileoanal anastomosis, creation of ileal reservoir' },
    { code: '44210', system: CPT, display: 'Laparoscopy, surgical; colectomy, total, abdominal, without proctectomy' },
    { code: '44211', system: CPT, display: 'Laparoscopy, surgical; colectomy, total, abdominal, with proctectomy' },
    { code: '44212', system: CPT, display: 'Laparoscopy, surgical; colectomy, total, abdominal, with proctectomy, with ileostomy' },
    // SNOMED codes
    { code: '26390003', system: SNOMEDCT, display: 'Total colectomy' },
    { code: '303401008', system: SNOMEDCT, display: 'Parks panproctocolectomy, bileostomy and ileoanal pouch' },
    { code: '307666008', system: SNOMEDCT, display: 'Total colectomy and ileostomy' },
    { code: '307667004', system: SNOMEDCT, display: 'Total colectomy, ileostomy and rectal mucous fistula' },
    { code: '307669001', system: SNOMEDCT, display: 'Total colectomy, ileostomy and closure of rectal stump' },
    { code: '31130001', system: SNOMEDCT, display: 'Total abdominal colectomy with proctectomy and ileostomy' },
    { code: '36192008', system: SNOMEDCT, display: 'Total abdominal colectomy with ileoproctostomy' },
    { code: '44751009', system: SNOMEDCT, display: 'Total abdominal colectomy with proctectomy and continent ileostomy' },
    { code: '456004', system: SNOMEDCT, display: 'Total abdominal colectomy with ileostomy' },
    { code: '80294005', system: SNOMEDCT, display: 'Total abdominal colectomy with rectal mucosectomy and ileoanal anastomosis' },
  ],
};

// =============================================================================
// COMMON EXCLUSION VALUE SETS (Used across multiple measures)
// =============================================================================

/**
 * Hospice Care - OID: 2.16.840.1.113883.3.464.1003.1003
 */
export const HOSPICE_CARE_VALUE_SET: StandardValueSet = {
  id: 'hospice-care',
  oid: '2.16.840.1.113883.3.464.1003.1003',
  name: 'Hospice Care',
  codes: [
    // ICD-10-CM
    { code: 'Z51.5', system: ICD10CM, display: 'Encounter for palliative care' },
    // CPT
    { code: '99377', system: CPT, display: 'Physician supervision of a hospice patient' },
    { code: '99378', system: CPT, display: 'Physician supervision of a hospice patient (additional 30 min)' },
    // HCPCS
    { code: 'G0182', system: HCPCS, display: 'Physician certification for Medicare-covered home health services' },
    { code: 'G9473', system: HCPCS, display: 'Services performed by chaplain in the hospice setting' },
    { code: 'G9474', system: HCPCS, display: 'Services performed by dietary counselor in hospice setting' },
    { code: 'G9475', system: HCPCS, display: 'Services performed by other counselor in hospice setting' },
    { code: 'G9476', system: HCPCS, display: 'Services performed by volunteer in hospice setting' },
    { code: 'G9477', system: HCPCS, display: 'Services performed by care coordinator in hospice setting' },
    { code: 'Q5003', system: HCPCS, display: 'Hospice care provided in nursing long term care facility' },
    { code: 'Q5004', system: HCPCS, display: 'Hospice care provided in skilled nursing facility' },
    { code: 'Q5005', system: HCPCS, display: 'Hospice care provided in inpatient hospital' },
    { code: 'Q5006', system: HCPCS, display: 'Hospice care provided in inpatient hospice facility' },
    { code: 'Q5007', system: HCPCS, display: 'Hospice care provided in long term care facility' },
    { code: 'Q5008', system: HCPCS, display: 'Hospice care provided in inpatient psychiatric facility' },
    { code: 'Q5010', system: HCPCS, display: 'Hospice home care provided in a hospice facility' },
    // SNOMED
    { code: '385763009', system: SNOMEDCT, display: 'Hospice care' },
    { code: '385765002', system: SNOMEDCT, display: 'Hospice care management' },
  ],
};

/**
 * Frailty/Advanced Illness - OID: 2.16.840.1.113883.3.464.1003.110.12.1082
 */
export const FRAILTY_VALUE_SET: StandardValueSet = {
  id: 'frailty',
  oid: '2.16.840.1.113883.3.464.1003.110.12.1082',
  name: 'Frailty',
  codes: [
    { code: 'R54', system: ICD10CM, display: 'Age-related physical debility' },
    { code: 'R62.7', system: ICD10CM, display: 'Adult failure to thrive' },
    { code: 'R64', system: ICD10CM, display: 'Cachexia' },
    { code: 'R26.0', system: ICD10CM, display: 'Ataxic gait' },
    { code: 'R26.1', system: ICD10CM, display: 'Paralytic gait' },
    { code: 'R26.2', system: ICD10CM, display: 'Difficulty in walking, not elsewhere classified' },
    { code: 'R26.89', system: ICD10CM, display: 'Other abnormalities of gait and mobility' },
    { code: 'R26.9', system: ICD10CM, display: 'Unspecified abnormalities of gait and mobility' },
    { code: 'Z74.01', system: ICD10CM, display: 'Bed confinement status' },
    { code: 'Z74.09', system: ICD10CM, display: 'Other reduced mobility' },
    { code: 'Z99.3', system: ICD10CM, display: 'Dependence on wheelchair' },
    { code: 'Z99.81', system: ICD10CM, display: 'Dependence on supplemental oxygen' },
    { code: 'M62.81', system: ICD10CM, display: 'Muscle weakness (generalized)' },
    { code: 'M62.84', system: ICD10CM, display: 'Sarcopenia' },
  ],
};

/**
 * Dementia and Related Conditions - OID: 2.16.840.1.113883.3.464.1003.113.12.1034
 */
export const DEMENTIA_VALUE_SET: StandardValueSet = {
  id: 'dementia',
  oid: '2.16.840.1.113883.3.464.1003.113.12.1034',
  name: 'Dementia and Related Conditions',
  codes: [
    { code: 'F01.50', system: ICD10CM, display: 'Vascular dementia without behavioral disturbance' },
    { code: 'F01.51', system: ICD10CM, display: 'Vascular dementia with behavioral disturbance' },
    { code: 'F02.80', system: ICD10CM, display: 'Dementia in other diseases classified elsewhere without behavioral disturbance' },
    { code: 'F02.81', system: ICD10CM, display: 'Dementia in other diseases classified elsewhere with behavioral disturbance' },
    { code: 'F03.90', system: ICD10CM, display: 'Unspecified dementia without behavioral disturbance' },
    { code: 'F03.91', system: ICD10CM, display: 'Unspecified dementia with behavioral disturbance' },
    { code: 'G30.0', system: ICD10CM, display: 'Alzheimer disease with early onset' },
    { code: 'G30.1', system: ICD10CM, display: 'Alzheimer disease with late onset' },
    { code: 'G30.8', system: ICD10CM, display: 'Other Alzheimer disease' },
    { code: 'G30.9', system: ICD10CM, display: 'Alzheimer disease, unspecified' },
    { code: 'G31.01', system: ICD10CM, display: 'Pick disease' },
    { code: 'G31.09', system: ICD10CM, display: 'Other frontotemporal dementia' },
    { code: 'G31.83', system: ICD10CM, display: 'Dementia with Lewy bodies' },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all CRC screening numerator value sets
 */
export function getCRCScreeningNumeratorValueSets(): StandardValueSet[] {
  return [
    COLONOSCOPY_VALUE_SET,
    FOBT_VALUE_SET,
    FIT_DNA_VALUE_SET,
    FLEXIBLE_SIGMOIDOSCOPY_VALUE_SET,
    CT_COLONOGRAPHY_VALUE_SET,
  ];
}

/**
 * Get all CRC screening exclusion value sets
 */
export function getCRCScreeningExclusionValueSets(): StandardValueSet[] {
  return [
    COLORECTAL_CANCER_VALUE_SET,
    TOTAL_COLECTOMY_VALUE_SET,
    HOSPICE_CARE_VALUE_SET,
    FRAILTY_VALUE_SET,
    DEMENTIA_VALUE_SET,
  ];
}

/**
 * Get all standard value sets organized by measure
 */
export const STANDARD_VALUE_SETS_BY_MEASURE: Record<string, {
  numerator: StandardValueSet[];
  exclusions: StandardValueSet[];
}> = {
  'CMS130': {
    numerator: getCRCScreeningNumeratorValueSets(),
    exclusions: getCRCScreeningExclusionValueSets(),
  },
  'colorectal-cancer-screening': {
    numerator: getCRCScreeningNumeratorValueSets(),
    exclusions: getCRCScreeningExclusionValueSets(),
  },
};

/**
 * Look up a value set by OID
 */
export function getValueSetByOID(oid: string): StandardValueSet | undefined {
  const allValueSets = [
    COLONOSCOPY_VALUE_SET,
    FOBT_VALUE_SET,
    FIT_DNA_VALUE_SET,
    FLEXIBLE_SIGMOIDOSCOPY_VALUE_SET,
    CT_COLONOGRAPHY_VALUE_SET,
    COLORECTAL_CANCER_VALUE_SET,
    TOTAL_COLECTOMY_VALUE_SET,
    HOSPICE_CARE_VALUE_SET,
    FRAILTY_VALUE_SET,
    DEMENTIA_VALUE_SET,
  ];
  return allValueSets.find(vs => vs.oid === oid);
}

/**
 * Get all standard value sets for browsing
 */
export function getAllStandardValueSets(): StandardValueSet[] {
  return [
    COLONOSCOPY_VALUE_SET,
    FOBT_VALUE_SET,
    FIT_DNA_VALUE_SET,
    FLEXIBLE_SIGMOIDOSCOPY_VALUE_SET,
    CT_COLONOGRAPHY_VALUE_SET,
    COLORECTAL_CANCER_VALUE_SET,
    TOTAL_COLECTOMY_VALUE_SET,
    HOSPICE_CARE_VALUE_SET,
    FRAILTY_VALUE_SET,
    DEMENTIA_VALUE_SET,
  ];
}

/**
 * Search standard value sets by name or OID
 */
export function searchStandardValueSets(query: string): StandardValueSet[] {
  const lowerQuery = query.toLowerCase();
  return getAllStandardValueSets().filter(vs =>
    vs.name.toLowerCase().includes(lowerQuery) ||
    vs.oid.includes(query) ||
    vs.codes.some(c =>
      c.code.toLowerCase().includes(lowerQuery) ||
      c.display.toLowerCase().includes(lowerQuery)
    )
  );
}

/**
 * Check if a code is in any of the given value sets
 */
export function isCodeInValueSets(
  code: string,
  system: string,
  valueSets: StandardValueSet[]
): { found: boolean; valueSet?: StandardValueSet; matchedCode?: StandardValueSet['codes'][0] } {
  const normalizedCode = code.toUpperCase().replace(/\./g, '');

  for (const vs of valueSets) {
    for (const vsCode of vs.codes) {
      const normalizedVsCode = vsCode.code.toUpperCase().replace(/\./g, '');
      if (normalizedCode === normalizedVsCode) {
        return { found: true, valueSet: vs, matchedCode: vsCode };
      }
    }
  }

  return { found: false };
}
