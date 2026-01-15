/**
 * Sample Measures for Testing
 */

import type { UniversalMeasureSpec, ValueSetReference } from '../types/ums';

/**
 * Sample CRC Screening Measure (CMS130)
 * Based on Colorectal Cancer Screening eCQM
 */
export function createSampleCRCMeasure(): UniversalMeasureSpec {
  const now = new Date().toISOString();
  const id = `ums-cms130-sample-${Date.now()}`;

  return {
    id,
    metadata: {
      measureId: 'CMS130v12',
      title: 'Colorectal Cancer Screening',
      version: '12.0.000',
      cbeNumber: '0034',
      steward: 'National Committee for Quality Assurance',
      program: 'MIPS_CQM',
      measureType: 'process',
      description: 'Percentage of adults 45-75 years of age who had appropriate screening for colorectal cancer.',
      rationale: 'Colorectal cancer is the second leading cause of cancer deaths in the United States. Regular screening can detect colorectal cancer early, when treatment is most effective.',
      clinicalRecommendation: 'The U.S. Preventive Services Task Force (USPSTF) recommends screening for colorectal cancer starting at age 45 years and continuing until age 75 years (Grade A recommendation).',
      submissionFrequency: 'Once per performance period',
      improvementNotation: 'increase',
      measurementPeriod: {
        start: '2025-01-01',
        end: '2025-12-31',
        inclusive: true,
      },
      lastUpdated: now,
      sourceDocuments: ['Sample Measure for Testing'],
    },
    populations: [
      {
        id: 'ip-0',
        type: 'initial_population',
        description: 'Patients 45-75 years of age with a visit during the measurement period',
        narrative: 'Patients 45-75 years of age with at least one eligible encounter during the measurement period.',
        confidence: 'high',
        reviewStatus: 'approved',
        criteria: {
          id: 'ip-criteria-0',
          operator: 'AND',
          description: 'Initial Population criteria',
          confidence: 'high',
          reviewStatus: 'approved',
          children: [
            {
              id: 'ip-elem-0-0',
              type: 'demographic',
              description: 'Patient age 45-75 years at start of measurement period',
              confidence: 'high',
              source: 'Sample',
              reviewStatus: 'approved',
              thresholds: {
                ageMin: 45,
                ageMax: 75,
              },
            },
            {
              id: 'ip-elem-0-1',
              type: 'encounter',
              description: 'Qualifying encounter during measurement period',
              valueSet: {
                id: 'vs-office-visit',
                name: 'Office Visit',
                oid: '2.16.840.1.113883.3.464.1003.101.12.1001',
                confidence: 'high',
                codes: [
                  { code: '99201', display: 'Office visit, new patient, minimal', system: 'CPT' },
                  { code: '99202', display: 'Office visit, new patient, low', system: 'CPT' },
                  { code: '99203', display: 'Office visit, new patient, moderate', system: 'CPT' },
                  { code: '99211', display: 'Office visit, established patient, minimal', system: 'CPT' },
                  { code: '99212', display: 'Office visit, established patient, low', system: 'CPT' },
                  { code: '99213', display: 'Office visit, established patient, moderate', system: 'CPT' },
                  { code: '99214', display: 'Office visit, established patient, high', system: 'CPT' },
                  { code: '99215', display: 'Office visit, established patient, comprehensive', system: 'CPT' },
                ],
                totalCodeCount: 8,
              },
              timingRequirements: [
                {
                  description: 'During measurement period',
                  relativeTo: 'measurement_period',
                  confidence: 'high',
                },
              ],
              confidence: 'high',
              source: 'Sample',
              reviewStatus: 'approved',
            },
          ],
        },
      },
      {
        id: 'den-0',
        type: 'denominator',
        description: 'Equals Initial Population',
        narrative: 'Equals Initial Population',
        confidence: 'high',
        reviewStatus: 'approved',
        criteria: {
          id: 'den-criteria-0',
          operator: 'AND',
          description: 'Denominator equals Initial Population',
          confidence: 'high',
          reviewStatus: 'approved',
          children: [],
        },
      },
      {
        id: 'ex-0',
        type: 'denominator_exclusion',
        description: 'Patients with colorectal cancer, total colectomy, hospice care, or advanced illness',
        narrative: 'Patients with a diagnosis of colorectal cancer, history of total colectomy, receiving hospice or palliative care, or with advanced illness and frailty.',
        confidence: 'high',
        reviewStatus: 'pending',
        criteria: {
          id: 'ex-criteria-0',
          operator: 'OR',
          description: 'Denominator Exclusion criteria',
          confidence: 'high',
          reviewStatus: 'pending',
          children: [
            {
              id: 'ex-elem-0-0',
              type: 'diagnosis',
              description: 'Diagnosis of colorectal cancer',
              valueSet: {
                id: 'vs-crc',
                name: 'Malignant Neoplasm of Colon',
                oid: '2.16.840.1.113883.3.464.1003.108.12.1001',
                confidence: 'medium',
                codes: [
                  { code: 'C18.9', display: 'Malignant neoplasm of colon, unspecified', system: 'ICD10' },
                ],
                totalCodeCount: 1,
              },
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
            {
              id: 'ex-elem-0-1',
              type: 'procedure',
              description: 'History of total colectomy',
              valueSet: {
                id: 'vs-colectomy',
                name: 'Total Colectomy',
                oid: '2.16.840.1.113883.3.464.1003.198.12.1019',
                confidence: 'medium',
                codes: [
                  { code: '44150', display: 'Colectomy, total, abdominal', system: 'CPT' },
                ],
                totalCodeCount: 1,
              },
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
            {
              id: 'ex-elem-0-2',
              type: 'encounter',
              description: 'Hospice or palliative care',
              valueSet: {
                id: 'vs-hospice',
                name: 'Hospice Care',
                oid: '2.16.840.1.113883.3.464.1003.1003',
                confidence: 'medium',
                codes: [
                  { code: 'Z51.5', display: 'Encounter for palliative care', system: 'ICD10' },
                ],
                totalCodeCount: 1,
              },
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
          ],
        },
      },
      {
        id: 'num-0',
        type: 'numerator',
        description: 'Patients with appropriate colorectal cancer screening',
        narrative: 'Patients with one or more screenings for colorectal cancer. Appropriate screenings include: Fecal occult blood test (FOBT) during the measurement period, FIT-DNA test during the measurement period or the two years prior, Flexible sigmoidoscopy during the measurement period or the four years prior, CT colonography during the measurement period or the four years prior, or Colonoscopy during the measurement period or the nine years prior.',
        confidence: 'high',
        reviewStatus: 'pending',
        criteria: {
          id: 'num-criteria-0',
          operator: 'OR',
          description: 'Numerator screening criteria',
          confidence: 'high',
          reviewStatus: 'pending',
          children: [
            {
              id: 'num-elem-0-0',
              type: 'procedure',
              description: 'Colonoscopy within 10 years',
              valueSet: {
                id: 'vs-colonoscopy',
                name: 'Colonoscopy',
                oid: '2.16.840.1.113883.3.464.1003.108.12.1020',
                confidence: 'medium',
                codes: [
                  { code: '45378', display: 'Colonoscopy, flexible; diagnostic', system: 'CPT' },
                  { code: '45380', display: 'Colonoscopy, flexible; with biopsy', system: 'CPT' },
                ],
                totalCodeCount: 2,
              },
              timingRequirements: [
                {
                  description: 'Within 10 years of measurement period end',
                  relativeTo: 'measurement_period_end',
                  window: { value: 10, unit: 'years', direction: 'before' },
                  confidence: 'high',
                },
              ],
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
            {
              id: 'num-elem-0-1',
              type: 'observation',
              description: 'FOBT during measurement period',
              valueSet: {
                id: 'vs-fobt',
                name: 'Fecal Occult Blood Test (FOBT)',
                oid: '2.16.840.1.113883.3.464.1003.198.12.1011',
                confidence: 'medium',
                codes: [
                  { code: '82270', display: 'Blood, occult, by peroxidase activity', system: 'CPT' },
                ],
                totalCodeCount: 1,
              },
              timingRequirements: [
                {
                  description: 'During measurement period',
                  relativeTo: 'measurement_period',
                  confidence: 'high',
                },
              ],
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
            {
              id: 'num-elem-0-2',
              type: 'observation',
              description: 'FIT-DNA test within 3 years',
              valueSet: {
                id: 'vs-fitdna',
                name: 'FIT-DNA (Stool DNA)',
                oid: '2.16.840.1.113883.3.464.1003.108.12.1039',
                confidence: 'medium',
                codes: [
                  { code: '81528', display: 'Oncology (colorectal) screening, stool-based DNA', system: 'CPT' },
                ],
                totalCodeCount: 1,
              },
              timingRequirements: [
                {
                  description: 'Within 3 years of measurement period end',
                  relativeTo: 'measurement_period_end',
                  window: { value: 3, unit: 'years', direction: 'before' },
                  confidence: 'high',
                },
              ],
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
            {
              id: 'num-elem-0-3',
              type: 'procedure',
              description: 'Flexible sigmoidoscopy within 5 years',
              valueSet: {
                id: 'vs-sigmoidoscopy',
                name: 'Flexible Sigmoidoscopy',
                oid: '2.16.840.1.113883.3.464.1003.198.12.1010',
                confidence: 'medium',
                codes: [
                  { code: '45330', display: 'Sigmoidoscopy, flexible; diagnostic', system: 'CPT' },
                ],
                totalCodeCount: 1,
              },
              timingRequirements: [
                {
                  description: 'Within 5 years of measurement period end',
                  relativeTo: 'measurement_period_end',
                  window: { value: 5, unit: 'years', direction: 'before' },
                  confidence: 'high',
                },
              ],
              confidence: 'medium',
              source: 'Sample',
              reviewStatus: 'pending',
            },
          ],
        },
      },
    ],
    valueSets: [
      {
        id: 'vs-office-visit',
        name: 'Office Visit',
        oid: '2.16.840.1.113883.3.464.1003.101.12.1001',
        confidence: 'high',
        source: 'Sample',
        verified: false,
        codes: [
          { code: '99201', display: 'Office visit, new patient, minimal', system: 'CPT' },
          { code: '99202', display: 'Office visit, new patient, low', system: 'CPT' },
          { code: '99203', display: 'Office visit, new patient, moderate', system: 'CPT' },
          { code: '99211', display: 'Office visit, established patient, minimal', system: 'CPT' },
          { code: '99212', display: 'Office visit, established patient, low', system: 'CPT' },
          { code: '99213', display: 'Office visit, established patient, moderate', system: 'CPT' },
          { code: '99214', display: 'Office visit, established patient, high', system: 'CPT' },
          { code: '99215', display: 'Office visit, established patient, comprehensive', system: 'CPT' },
        ],
        totalCodeCount: 8,
      },
    ],
    overallConfidence: 'medium',
    reviewProgress: { total: 12, approved: 4, pending: 8, flagged: 0 },
    createdAt: now,
    updatedAt: now,
  };
}
