/**
 * Measure Extraction Service
 *
 * Orchestrates AI-based measure extraction by calling the backend LLM proxy.
 * Extracts metadata, populations, criteria, and value sets from measure specifications.
 */

import { post } from '../api/client';
import type {
  UniversalMeasureSpec,
  PopulationDefinition,
  LogicalClause,
  DataElement,
  ValueSetReference,
  ConfidenceLevel,
  ReviewStatus,
  MeasureMetadata,
} from '../types/ums';

// ============================================================================
// Types
// ============================================================================

export interface ExtractionOptions {
  provider?: string;
  model?: string;
  onProgress?: (phase: string, message: string) => void;
}

export interface ExtractionResult {
  success: boolean;
  ums: UniversalMeasureSpec | null;
  extractedData?: ExtractedData;
  skeleton?: ExtractedSkeleton;
  tokensUsed: number;
  error?: string;
}

interface ExtractedSkeleton {
  metadata: Partial<MeasureMetadata>;
  populationTypes: string[];
  valueSetCount: number;
  hasTimingConstraints: boolean;
  hasAgeConstraints: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

interface ExtractedData {
  metadata: Partial<MeasureMetadata> & {
    rationale?: string;
    clinicalRecommendation?: string;
    measurementPeriod?: {
      start: string;
      end: string;
    };
  };
  globalConstraints?: {
    ageMin?: number | null;
    ageMax?: number | null;
    ageCalculation?: string;
    gender?: string;
  };
  populations: ExtractedPopulation[];
  valueSets: ExtractedValueSet[];
}

interface ExtractedPopulation {
  type: string;
  description: string;
  narrative?: string;
  criteria?: ExtractedCriteria;
}

interface ExtractedCriteria {
  operator?: 'AND' | 'OR';
  description?: string;
  children?: (ExtractedCriterion | ExtractedCriteria)[];
}

interface ExtractedCriterion {
  type?: string;
  dataType?: string;
  description: string;
  valueSet?: { oid?: string; name?: string };
  timing?: {
    type: string;
    period?: string;
    offset?: string;
    offsetUnit?: string;
  };
}

interface ExtractedValueSet {
  oid?: string;
  name: string;
  purpose?: string;
  version?: string;
}

interface LlmResponse {
  content: string;
  tokensUsed: number;
  provider: string;
  model: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an expert in healthcare quality measures, CQL (Clinical Quality Language), and FHIR.
Your task is to extract structured measure data from a quality measure specification document.

Extract the following information in valid JSON format:

{
  "metadata": {
    "measureId": "CMS measure ID (e.g., CMS130v12)",
    "title": "Full measure title",
    "version": "Version number",
    "steward": "Measure steward organization",
    "program": "Quality program (MIPS_CQM, eCQM, HEDIS, etc.)",
    "measureType": "process|outcome|structure|patient_experience",
    "description": "Brief description",
    "rationale": "Clinical rationale",
    "clinicalRecommendation": "Clinical recommendation statement",
    "measurementPeriod": {
      "start": "YYYY-01-01",
      "end": "YYYY-12-31"
    }
  },
  "globalConstraints": {
    "ageMin": number or null,
    "ageMax": number or null,
    "ageCalculation": "at_start|at_end|during",
    "gender": "any|male|female"
  },
  "populations": [
    {
      "type": "initial_population|denominator|numerator|denominator_exclusion|denominator_exception|numerator_exclusion",
      "description": "Human-readable description",
      "narrative": "Detailed narrative of criteria",
      "criteria": {
        "operator": "AND|OR",
        "children": [
          {
            "type": "dataElement|reference|logicalClause",
            "dataType": "Condition|Procedure|Encounter|Observation|MedicationRequest|etc.",
            "valueSet": { "oid": "2.16.840.1...", "name": "Value Set Name" },
            "timing": { "type": "during|before|after|within", "period": "measurement_period|custom", "offset": "90 days", "offsetUnit": "days" },
            "description": "Description of this criterion"
          }
        ]
      }
    }
  ],
  "valueSets": [
    {
      "oid": "2.16.840.1.xxx",
      "name": "Value Set Name",
      "purpose": "What this value set represents"
    }
  ]
}

Important guidelines:
1. Extract ALL populations mentioned (IP, Denominator, Numerator, Exclusions, Exceptions)
2. Capture timing constraints precisely (during measurement period, within 90 days, etc.)
3. Identify value sets by their OIDs when available
4. Use proper FHIR resource types for data elements
5. For age constraints, identify the calculation method (at start, at end, or during period)
6. Preserve the logical structure (AND/OR groupings) of criteria
7. If something is unclear, use null or omit it rather than guessing

Return ONLY the JSON object, no additional text or markdown.`;

const SKELETON_SYSTEM_PROMPT = `You are an expert in healthcare quality measures. Your task is to extract a high-level skeleton of a measure from its specification.

Extract the following in valid JSON format:

{
  "metadata": {
    "measureId": "CMS measure ID",
    "title": "Full measure title",
    "version": "Version number",
    "steward": "Measure steward",
    "program": "MIPS_CQM|eCQM|HEDIS|QOF|Registry|Custom",
    "measureType": "process|outcome|structure|patient_experience",
    "description": "Brief description"
  },
  "populationTypes": ["initial_population", "denominator", "numerator", "denominator_exclusion", "etc."],
  "valueSetCount": number,
  "hasTimingConstraints": boolean,
  "hasAgeConstraints": boolean,
  "estimatedComplexity": "low|medium|high"
}

Return ONLY the JSON object, no additional text.`;

const POPULATION_DETAIL_PROMPT = `You are an expert in healthcare quality measures. Given the following measure specification text and population type, extract detailed criteria for that population.

Extract in this JSON format:

{
  "type": "the_population_type",
  "description": "Human-readable description",
  "narrative": "Full narrative from the spec",
  "criteria": {
    "operator": "AND|OR",
    "children": [
      {
        "type": "dataElement",
        "dataType": "Condition|Procedure|Encounter|Observation|MedicationRequest",
        "valueSet": { "oid": "2.16.840.1...", "name": "Name" },
        "timing": { "type": "during|before|after|within", "period": "measurement_period" },
        "description": "Description"
      }
    ]
  }
}

Return ONLY the JSON object.`;

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract measure data from specification text using AI.
 */
export async function extractMeasure(
  documentText: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { onProgress, provider, model } = options;

  try {
    // Phase 1: Skeleton extraction
    onProgress?.('skeleton', 'Analyzing document structure...');

    const skeletonResult = await callLlmExtract({
      systemPrompt: SKELETON_SYSTEM_PROMPT,
      userPrompt: `Extract the measure skeleton from this specification:\n\n${documentText}`,
      provider,
      model,
      maxTokens: 4000,
    });

    const skeleton = parseJsonResponse(skeletonResult.content) as ExtractedSkeleton | null;
    if (!skeleton) {
      throw new Error('Failed to parse skeleton extraction response');
    }

    onProgress?.('skeleton_complete', `Found ${skeleton.populationTypes?.length || 0} populations`);

    // Phase 2: Full extraction
    onProgress?.('extraction', 'Extracting populations and criteria...');

    const fullResult = await callLlmExtract({
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      userPrompt: `Extract complete measure data from this specification:\n\n${documentText}`,
      provider,
      model,
      maxTokens: 16000,
    });

    const extractedData = parseJsonResponse(fullResult.content) as ExtractedData | null;
    if (!extractedData) {
      throw new Error('Failed to parse extraction response');
    }

    onProgress?.('extraction_complete', `Extracted ${extractedData.populations?.length || 0} populations`);

    // Phase 3: Convert to UMS format
    onProgress?.('converting', 'Converting to UMS format...');

    const ums = convertToUMS(extractedData);

    onProgress?.('complete', 'Extraction complete');

    return {
      success: true,
      ums,
      extractedData,
      skeleton,
      tokensUsed: (skeletonResult.tokensUsed || 0) + (fullResult.tokensUsed || 0),
    };
  } catch (error) {
    console.error('Extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      ums: null,
      tokensUsed: 0,
    };
  }
}

/**
 * Extract measure data using multi-pass strategy for complex documents.
 */
export async function extractMeasureMultiPass(
  documentText: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { onProgress, provider, model } = options;

  try {
    // Phase 1: Get skeleton
    onProgress?.('skeleton', 'Analyzing document structure...');

    const skeletonResult = await callLlmExtract({
      systemPrompt: SKELETON_SYSTEM_PROMPT,
      userPrompt: `Extract the measure skeleton:\n\n${documentText}`,
      provider,
      model,
      maxTokens: 4000,
    });

    const skeleton = parseJsonResponse(skeletonResult.content) as ExtractedSkeleton | null;
    if (!skeleton) {
      throw new Error('Failed to parse skeleton');
    }

    const populationTypes = skeleton.populationTypes || [
      'initial_population',
      'denominator',
      'numerator',
    ];

    onProgress?.('skeleton_complete', `Found ${populationTypes.length} population types`);

    // Phase 2: Extract each population in detail
    const populations: ExtractedPopulation[] = [];
    let totalTokens = skeletonResult.tokensUsed || 0;

    for (let i = 0; i < populationTypes.length; i++) {
      const popType = populationTypes[i];
      onProgress?.('population', `Extracting ${formatPopulationType(popType)} (${i + 1}/${populationTypes.length})...`);

      const popResult = await callLlmExtract({
        systemPrompt: POPULATION_DETAIL_PROMPT,
        userPrompt: `Population type: ${popType}\n\nMeasure specification:\n${documentText}`,
        provider,
        model,
        maxTokens: 8000,
      });

      const popData = parseJsonResponse(popResult.content) as ExtractedPopulation | null;
      if (popData) {
        populations.push(popData);
      }

      totalTokens += popResult.tokensUsed || 0;
    }

    onProgress?.('populations_complete', `Extracted ${populations.length} populations`);

    // Phase 3: Extract value sets
    onProgress?.('valueSets', 'Identifying value sets...');

    const vsResult = await callLlmExtract({
      systemPrompt: `Extract all value sets referenced in this measure specification. Return JSON: { "valueSets": [{ "oid": "...", "name": "...", "purpose": "..." }] }`,
      userPrompt: documentText,
      provider,
      model,
      maxTokens: 4000,
    });

    const vsData = parseJsonResponse(vsResult.content) as { valueSets?: ExtractedValueSet[] } | null;
    totalTokens += vsResult.tokensUsed || 0;

    // Phase 4: Assemble full UMS
    onProgress?.('converting', 'Assembling UMS...');

    const extractedData: ExtractedData = {
      metadata: skeleton.metadata || {},
      populations,
      valueSets: vsData?.valueSets || [],
    };

    const ums = convertToUMS(extractedData);

    onProgress?.('complete', 'Multi-pass extraction complete');

    return {
      success: true,
      ums,
      extractedData,
      skeleton,
      tokensUsed: totalTokens,
    };
  } catch (error) {
    console.error('Multi-pass extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Multi-pass extraction failed',
      ums: null,
      tokensUsed: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface LlmExtractRequest {
  systemPrompt: string;
  userPrompt: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
  images?: string[];
}

/**
 * Call the backend LLM extract endpoint.
 */
async function callLlmExtract(request: LlmExtractRequest): Promise<LlmResponse> {
  const response = await post<LlmResponse>('/llm/extract', {
    systemPrompt: request.systemPrompt,
    userPrompt: request.userPrompt,
    provider: request.provider || null,
    model: request.model || null,
    maxTokens: request.maxTokens || 16000,
    images: request.images || null,
  });

  return response;
}

/**
 * Parse JSON from LLM response, handling markdown code blocks.
 */
function parseJsonResponse(content: string): unknown | null {
  if (!content) return null;

  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object boundaries
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        // Fall through
      }
    }

    console.warn('Failed to parse JSON response:', content.slice(0, 200));
    return null;
  }
}

/**
 * Convert extracted data to UMS format for the frontend.
 */
function convertToUMS(extractedData: ExtractedData): UniversalMeasureSpec {
  const now = new Date().toISOString();
  const metadata = extractedData.metadata || {};

  // Build populations array
  const populations: PopulationDefinition[] = (extractedData.populations || []).map((pop, idx) => ({
    id: `pop-${Date.now()}-${idx}`,
    type: mapPopulationType(pop.type),
    description: pop.description || '',
    narrative: pop.narrative || pop.description || '',
    criteria: convertCriteria(pop.criteria),
    confidence: 'medium' as ConfidenceLevel,
    reviewStatus: 'pending' as ReviewStatus,
  }));

  // Ensure we have at least IP, Denominator, Numerator
  const existingTypes = new Set(populations.map(p => p.type));
  const requiredTypes: Array<PopulationDefinition['type']> = ['initial-population', 'denominator', 'numerator'];

  for (const type of requiredTypes) {
    if (!existingTypes.has(type)) {
      populations.push({
        id: `pop-${Date.now()}-${type}`,
        type,
        description: formatPopulationType(type),
        narrative: '',
        criteria: {
          id: `clause-${Date.now()}-${type}`,
          operator: 'AND',
          description: '',
          children: [],
          confidence: 'medium' as ConfidenceLevel,
          reviewStatus: 'pending' as ReviewStatus,
        },
        confidence: 'low' as ConfidenceLevel,
        reviewStatus: 'pending' as ReviewStatus,
      });
    }
  }

  // Build value sets array
  const valueSets: ValueSetReference[] = (extractedData.valueSets || []).map((vs, idx) => ({
    id: `vs-${Date.now()}-${idx}`,
    oid: vs.oid || '',
    name: vs.name || 'Unnamed Value Set',
    purpose: vs.purpose || '',
    version: vs.version || '',
    codes: [],
  }));

  return {
    id: `ums-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    resourceType: 'Measure',
    metadata: {
      measureId: metadata.measureId || 'NEW-001',
      title: metadata.title || 'Extracted Measure',
      version: metadata.version || '1.0',
      steward: metadata.steward || '',
      program: mapProgram(metadata.program),
      measureType: mapMeasureType(metadata.measureType),
      description: metadata.description || '',
      rationale: metadata.rationale || '',
      clinicalRecommendation: metadata.clinicalRecommendation || '',
      measurementPeriod: {
        start: metadata.measurementPeriod?.start || `${new Date().getFullYear()}-01-01`,
        end: metadata.measurementPeriod?.end || `${new Date().getFullYear()}-12-31`,
        inclusive: true,
      },
      lastUpdated: now,
    },
    globalConstraints: extractedData.globalConstraints ? {
      ageRange: {
        min: extractedData.globalConstraints.ageMin ?? 0,
        max: extractedData.globalConstraints.ageMax ?? 150,
      },
      gender: (extractedData.globalConstraints.gender as 'any' | 'male' | 'female') || 'any',
    } : undefined,
    populations,
    valueSets,
    status: 'in_progress',
    overallConfidence: 'medium' as ConfidenceLevel,
    reviewProgress: {
      total: populations.length,
      approved: 0,
      pending: populations.length,
      flagged: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert extracted criteria to UMS LogicalClause format.
 */
function convertCriteria(criteria?: ExtractedCriteria): LogicalClause {
  if (!criteria) {
    return {
      id: `clause-${Date.now()}`,
      operator: 'AND',
      description: '',
      children: [],
      confidence: 'medium' as ConfidenceLevel,
      reviewStatus: 'pending' as ReviewStatus,
    };
  }

  const clause: LogicalClause = {
    id: `clause-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    operator: criteria.operator || 'AND',
    description: criteria.description || '',
    children: [],
    confidence: 'medium' as ConfidenceLevel,
    reviewStatus: 'pending' as ReviewStatus,
  };

  if (Array.isArray(criteria.children)) {
    clause.children = criteria.children.map((child, idx) => {
      // Check if it's a nested clause (has operator property)
      if ('operator' in child) {
        return convertCriteria(child as ExtractedCriteria);
      }

      // Data element
      const criterion = child as ExtractedCriterion;
      const dataElement: DataElement = {
        id: `elem-${Date.now()}-${idx}`,
        type: mapElementType(criterion.dataType),
        description: criterion.description || '',
        confidence: 'medium' as ConfidenceLevel,
        reviewStatus: 'pending' as ReviewStatus,
      };

      if (criterion.valueSet) {
        dataElement.valueSet = {
          id: `vs-${Date.now()}-${idx}`,
          oid: criterion.valueSet.oid || '',
          name: criterion.valueSet.name || '',
          codes: [],
        };
      }

      return dataElement;
    });
  }

  return clause;
}

/**
 * Map population type string to UMS type.
 */
function mapPopulationType(type: string): PopulationDefinition['type'] {
  const mapping: Record<string, PopulationDefinition['type']> = {
    'initial_population': 'initial-population',
    'INITIAL_POPULATION': 'initial-population',
    'denominator': 'denominator',
    'DENOMINATOR': 'denominator',
    'denominator_exclusion': 'denominator-exclusion',
    'DENOMINATOR_EXCLUSION': 'denominator-exclusion',
    'denominator_exception': 'denominator-exception',
    'DENOMINATOR_EXCEPTION': 'denominator-exception',
    'numerator': 'numerator',
    'NUMERATOR': 'numerator',
    'numerator_exclusion': 'numerator-exclusion',
    'NUMERATOR_EXCLUSION': 'numerator-exclusion',
    'measure_population': 'measure-population',
    'MEASURE_POPULATION': 'measure-population',
    'measure_observation': 'measure-observation',
    'MEASURE_OBSERVATION': 'measure-observation',
  };
  return mapping[type] || 'initial-population';
}

/**
 * Map element type to UMS DataElement type.
 */
function mapElementType(type?: string): DataElement['type'] {
  if (!type) return 'observation';
  const mapping: Record<string, DataElement['type']> = {
    'Condition': 'diagnosis',
    'condition': 'diagnosis',
    'Encounter': 'encounter',
    'encounter': 'encounter',
    'Procedure': 'procedure',
    'procedure': 'procedure',
    'Observation': 'observation',
    'observation': 'observation',
    'MedicationRequest': 'medication',
    'medication': 'medication',
    'Immunization': 'immunization',
    'immunization': 'immunization',
    'Patient': 'demographic',
    'demographic': 'demographic',
    'Device': 'device',
    'device': 'device',
    'Assessment': 'assessment',
    'assessment': 'assessment',
    'AllergyIntolerance': 'allergy',
    'allergy': 'allergy',
  };
  return mapping[type] || 'observation';
}

/**
 * Map program string to MeasureMetadata program type.
 */
function mapProgram(program?: string): MeasureMetadata['program'] {
  if (!program) return 'Custom';
  if (program.includes('MIPS') || program === 'MIPS_CQM') return 'MIPS_CQM';
  if (program === 'eCQM' || program === 'ECQM') return 'eCQM';
  if (program === 'HEDIS') return 'HEDIS';
  if (program === 'QOF') return 'QOF';
  if (program === 'Registry') return 'Registry';
  return 'Custom';
}

/**
 * Map measure type string to MeasureMetadata measureType.
 */
function mapMeasureType(type?: string): MeasureMetadata['measureType'] {
  if (!type) return 'process';
  if (type === 'outcome') return 'outcome';
  if (type === 'structure') return 'structure';
  if (type === 'patient_experience') return 'patient_experience';
  return 'process';
}

/**
 * Format population type for display.
 */
function formatPopulationType(type: string): string {
  const labels: Record<string, string> = {
    'initial_population': 'Initial Population',
    'initial-population': 'Initial Population',
    'denominator': 'Denominator',
    'numerator': 'Numerator',
    'denominator_exclusion': 'Denominator Exclusion',
    'denominator-exclusion': 'Denominator Exclusion',
    'denominator_exception': 'Denominator Exception',
    'denominator-exception': 'Denominator Exception',
    'numerator_exclusion': 'Numerator Exclusion',
    'numerator-exclusion': 'Numerator Exclusion',
    'measure_population': 'Measure Population',
    'measure-population': 'Measure Population',
    'measure_observation': 'Measure Observation',
    'measure-observation': 'Measure Observation',
  };
  return labels[type] || type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// PDF Text Extraction (client-side)
// ============================================================================

/**
 * Extract text from a PDF file using pdf.js.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamic import pdf.js
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: { str?: string }) => item.str || '').join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

/**
 * Extract text from uploaded files (PDF or text).
 */
export async function extractTextFromFiles(files: File[]): Promise<string> {
  const textParts: string[] = [];

  for (const file of files) {
    if (file.type === 'application/pdf') {
      try {
        const pdfText = await extractTextFromPDF(file);
        textParts.push(`--- ${file.name} ---\n${pdfText}`);
      } catch (error) {
        console.error(`Failed to extract PDF ${file.name}:`, error);
        textParts.push(`--- ${file.name} (extraction failed) ---`);
      }
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      textParts.push(`--- ${file.name} ---\n${text}`);
    } else {
      console.warn(`Unsupported file type: ${file.type} for ${file.name}`);
    }
  }

  return textParts.join('\n\n');
}

export default {
  extractMeasure,
  extractMeasureMultiPass,
  extractTextFromPDF,
  extractTextFromFiles,
};
