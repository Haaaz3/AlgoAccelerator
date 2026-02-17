import type { UniversalMeasureSpec, IngestionResult, ConfidenceLevel, PopulationDefinition, DataElement, ValueSetReference, ParsedSection, CodeSystem, MeasureType, PopulationType } from '../types/ums';
import { getCodeSystemUrl } from '../types/fhir-measure';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Configure PDF.js worker - use local worker from public folder to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Parse a measure specification file into a Universal Measure Spec (UMS)
 * Supports PDF, Excel (xlsx/xls), HTML, ZIP packages, and text files
 */
export async function parseMeasureSpec(file: File): Promise<IngestionResult> {
  const warnings: string[] = [];
  const parsingNotes: string[] = [];

  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    parsingNotes.push(`Processing file: ${file.name} (${fileExtension})`);

    // Handle ZIP files (eCQM packages)
    if (fileExtension === 'zip') {
      return await parseZipPackage(file);
    }

    // Extract content based on file type
    let parsedData: ParsedMeasureData;

    if (['html', 'htm'].includes(fileExtension)) {
      parsedData = await parseECQMHtml(file);
      parsingNotes.push(`Parsed eCQM HTML: found ${Object.keys(parsedData).filter(k => parsedData[k as keyof ParsedMeasureData]).length} fields`);
    } else if (['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      parsedData = await parseExcelSpec(file);
      parsingNotes.push(`Parsed Excel: found ${parsedData.populations.length} populations`);
    } else if (fileExtension === 'pdf') {
      parsedData = await parsePdfSpec(file);
      parsingNotes.push(`Parsed PDF: extracted ${parsedData.title ? 'title' : 'no title'}`);
    } else if (['xml', 'json'].includes(fileExtension)) {
      parsedData = await parseStructuredSpec(file, fileExtension);
      parsingNotes.push(`Parsed ${fileExtension.toUpperCase()}: found ${parsedData.populations.length} populations`);
    } else {
      // Try text-based parsing
      const text = await file.text();
      parsedData = parseTextContent(text, file.name);
      parsingNotes.push(`Parsed as text: ${text.length} characters`);
    }

    // Generate UMS from parsed data
    const ums = generateUMSFromParsedData(parsedData, file.name);

    parsingNotes.push(`Generated UMS with ${ums.populations.length} populations`);
    parsingNotes.push(`Identified ${ums.valueSets.length} value sets`);
    parsingNotes.push(`Overall confidence: ${ums.overallConfidence}`);

    if (parsedData.warnings.length > 0) {
      warnings.push(...parsedData.warnings);
    }

    return {
      success: true,
      ums,
      sections: parsedData.sections,
      warnings,
      parsingNotes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parse error:', error);
    return {
      success: false,
      ums: generateFallbackUMS(file.name),
      sections: [],
      warnings: [`Error parsing document: ${errorMessage}`],
      parsingNotes: ['Falling back to filename-based extraction'],
    };
  }
}

/**
 * Parse eCQM HTML format - the standard CMS measure specification format
 */
async function parseECQMHtml(file: File): Promise<ParsedMeasureData> {
  const htmlContent = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const data: ParsedMeasureData = {
    measureId: null,
    title: null,
    description: null,
    measureType: 'process',
    steward: null,
    cbeNumber: null,
    version: null,
    populations: [],
    valueSets: [],
    codes: [],
    sections: [],
    warnings: [],
    ageRange: null,
    rationale: null,
    clinicalRecommendation: null,
    cqlDefinitions: {},
  };

  // Extract data from table rows with row-header class
  const rows = doc.querySelectorAll('tr');
  rows.forEach(row => {
    const header = row.querySelector('.row-header .td_label, th.row-header span');
    const valueCell = row.querySelector('td:not(.row-header)');

    if (!header || !valueCell) return;

    const label = header.textContent?.trim().toLowerCase() || '';
    const value = valueCell.textContent?.trim() || '';
    const preValue = valueCell.querySelector('pre')?.textContent?.trim() || value;

    // Map labels to data fields
    if (label.includes('ecqm title') || label === 'title') {
      data.title = preValue.replace(/\s+/g, ' ');
    } else if (label.includes('ecqm identifier') || label === 'identifier') {
      const match = value.match(/(\d+)/);
      if (match) data.measureId = match[1].padStart(3, '0');
    } else if (label.includes('version')) {
      data.version = value;
    } else if (label.includes('cbe number') || label.includes('nqf')) {
      if (!value.toLowerCase().includes('not applicable')) {
        data.cbeNumber = value;
      }
    } else if (label === 'description' || label.includes('measure description')) {
      data.description = preValue;
    } else if (label.includes('steward')) {
      data.steward = value;
    } else if (label.includes('measure type')) {
      const typeText = value.toLowerCase();
      if (typeText.includes('outcome')) data.measureType = 'outcome';
      else if (typeText.includes('structure')) data.measureType = 'structure';
      else data.measureType = 'process';
    } else if (label === 'rationale') {
      data.rationale = preValue;
    } else if (label.includes('clinical recommendation')) {
      data.clinicalRecommendation = preValue;
    } else if (label === 'initial population') {
      data.populations.push({
        type: 'initial_population',
        description: preValue.substring(0, 200),
        narrative: preValue,
        criteria: [],
      });
    } else if (label === 'denominator' && !label.includes('exclusion') && !label.includes('exception')) {
      data.populations.push({
        type: 'denominator',
        description: preValue.substring(0, 200),
        narrative: preValue,
        criteria: [],
      });
    } else if (label.includes('denominator exclusion')) {
      data.populations.push({
        type: 'denominator_exclusion',
        description: preValue.substring(0, 200),
        narrative: preValue,
        criteria: extractCriteriaFromText(preValue),
      });
    } else if (label.includes('denominator exception')) {
      data.populations.push({
        type: 'denominator_exception',
        description: preValue.substring(0, 200),
        narrative: preValue,
        criteria: [],
      });
    } else if (label === 'numerator' && !label.includes('exclusion')) {
      data.populations.push({
        type: 'numerator',
        description: preValue.substring(0, 200),
        narrative: preValue,
        criteria: extractCriteriaFromText(preValue),
      });
    } else if (label.includes('numerator exclusion')) {
      if (!preValue.toLowerCase().includes('not applicable')) {
        data.populations.push({
          type: 'numerator_exclusion',
          description: preValue.substring(0, 200),
          narrative: preValue,
          criteria: [],
        });
      }
    }
  });

  // Extract CQL definitions from cql-definition-body elements
  const cqlDefs = doc.querySelectorAll('.cql-definition-body, pre.code');
  cqlDefs.forEach(def => {
    const cql = def.textContent?.trim();
    if (cql) {
      // Try to find the definition name from surrounding context
      const parent = def.closest('li');
      const label = parent?.querySelector('label strong')?.textContent?.trim();
      if (label && cql) {
        data.cqlDefinitions[label] = cql;

        // Also extract value set references from CQL
        const cqlVsMatches = cql.matchAll(/\[([^\]]+):\s*"([^"]+)"\]/g);
        for (const match of cqlVsMatches) {
          const criteriaType = match[1]; // e.g., "Condition", "Encounter", "Observation"
          const vsName = match[2];

          // Find the corresponding value set and add context
          const vs = data.valueSets.find(v => v.name === vsName);
          if (vs) {
            // Mark the purpose based on CQL context
            if (!vs.codeSystem) {
              if (criteriaType.includes('Condition') || criteriaType.includes('Diagnosis')) {
                vs.codeSystem = 'ICD10' as any;
              } else if (criteriaType.includes('Encounter')) {
                vs.codeSystem = 'CPT' as any;
              } else if (criteriaType.includes('Observation')) {
                vs.codeSystem = 'LOINC' as any;
              } else if (criteriaType.includes('Medication')) {
                vs.codeSystem = 'RxNorm' as any;
              }
            }
          }
        }
      }
    }
  });

  // Extract age range from description or populations
  const allText = [data.description, ...data.populations.map(p => p.narrative)].join(' ');
  const ageMatch = allText.match(/(\d+)\s*[-–to]+\s*(\d+)\s*years/i);
  if (ageMatch) {
    data.ageRange = { min: parseInt(ageMatch[1]), max: parseInt(ageMatch[2]) };
  }

  // Extract value sets from the document - look for the standard eCQM format
  // Format: valueset "Name" (2.16.840.1.113883.x.xxx.xxx)
  const vsPattern = /valueset\s+"([^"]+)"\s*\((\d[\d.]+)\)/gi;
  let vsMatch;
  while ((vsMatch = vsPattern.exec(htmlContent)) !== null) {
    const name = vsMatch[1].trim();
    const oid = vsMatch[2];
    if (!data.valueSets.find(vs => vs.oid === oid)) {
      data.valueSets.push({ name, oid, codeSystem: null, codes: [] });
    }
  }

  // Also look for terminology section list items
  const terminologyLists = doc.querySelectorAll('li');
  terminologyLists.forEach(li => {
    const text = li.textContent || '';
    const match = text.match(/valueset\s+"([^"]+)"\s*\((\d[\d.]+)\)/i);
    if (match) {
      const name = match[1].trim();
      const oid = match[2];
      if (!data.valueSets.find(vs => vs.oid === oid)) {
        data.valueSets.push({ name, oid, codeSystem: null, codes: [] });
      }
    }
  });

  // Extract direct codes if listed in the document
  // Look for code patterns in Data Criteria section
  const dataCriteriaSection = htmlContent.match(/Data Criteria.*?(?=<\/ul>|Population Criteria|$)/gis);
  if (dataCriteriaSection) {
    for (const section of dataCriteriaSection) {
      // Extract using patterns like "Diagnosis: Diabetes" using "Diabetes (OID)"
      const usingPattern = /"([^"]+)"\s+using\s+"([^"]+)\s*\((\d[\d.]+)\)"/gi;
      let usingMatch;
      while ((usingMatch = usingPattern.exec(section)) !== null) {
        // This links a concept to a value set
        const vsName = usingMatch[2];
        const oid = usingMatch[3];

        // Add to value sets if not already there
        if (!data.valueSets.find(vs => vs.oid === oid)) {
          data.valueSets.push({ name: vsName, oid, codeSystem: null, codes: [] });
        }
      }
    }
  }

  return data;
}

/**
 * Parse Excel specification files
 */
async function parseExcelSpec(file: File): Promise<ParsedMeasureData> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const data: ParsedMeasureData = {
    measureId: null,
    title: null,
    description: null,
    measureType: 'process',
    steward: null,
    cbeNumber: null,
    version: null,
    populations: [],
    valueSets: [],
    codes: [],
    sections: [],
    warnings: [],
    ageRange: null,
    rationale: null,
    clinicalRecommendation: null,
    cqlDefinitions: {},
  };

  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

    // Look for measure metadata in the first few rows
    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const label = String(row[0]).toLowerCase().trim();
      const value = String(row[1]).trim();

      if (label.includes('measure') && label.includes('id')) {
        const match = value.match(/(\d+)/);
        if (match) data.measureId = match[1].padStart(3, '0');
      } else if (label.includes('title') || label.includes('name')) {
        if (!data.title) data.title = value;
      } else if (label.includes('description')) {
        data.description = value;
      } else if (label.includes('steward')) {
        data.steward = value;
      }
    }

    // Look for population definitions
    const sheetLower = sheetName.toLowerCase();
    if (sheetLower.includes('population') || sheetLower.includes('criteria')) {
      for (const row of rows) {
        const firstCell = String(row[0] || '').toLowerCase();
        const value = String(row[1] || '');

        if (firstCell.includes('initial') && firstCell.includes('population')) {
          data.populations.push({
            type: 'initial_population',
            description: value.substring(0, 200),
            narrative: value,
            criteria: [],
          });
        } else if (firstCell === 'denominator') {
          data.populations.push({
            type: 'denominator',
            description: value.substring(0, 200),
            narrative: value,
            criteria: [],
          });
        } else if (firstCell.includes('exclusion')) {
          data.populations.push({
            type: 'denominator_exclusion',
            description: value.substring(0, 200),
            narrative: value,
            criteria: extractCriteriaFromText(value),
          });
        } else if (firstCell === 'numerator') {
          data.populations.push({
            type: 'numerator',
            description: value.substring(0, 200),
            narrative: value,
            criteria: [],
          });
        }
      }
    }

    // Look for value sets/codes sheets
    if (sheetLower.includes('value') || sheetLower.includes('code') || sheetLower.includes('terminology')) {
      // Find header row
      let headerRow = -1;
      let codeCol = -1, displayCol = -1, systemCol = -1, vsNameCol = -1, oidCol = -1;

      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j]).toLowerCase();
          if (cell.includes('code') && !cell.includes('system')) codeCol = j;
          if (cell.includes('display') || cell.includes('description') || cell.includes('name')) displayCol = j;
          if (cell.includes('system') || cell.includes('code system')) systemCol = j;
          if (cell.includes('value set') && cell.includes('name')) vsNameCol = j;
          if (cell.includes('oid')) oidCol = j;
        }
        if (codeCol >= 0) {
          headerRow = i;
          break;
        }
      }

      if (headerRow >= 0 && codeCol >= 0) {
        const currentVS: Map<string, ParsedValueSet> = new Map();

        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          const code = String(row[codeCol] || '').trim();
          if (!code) continue;

          const display = displayCol >= 0 ? String(row[displayCol] || '') : code;
          const system = systemCol >= 0 ? mapCodeSystem(String(row[systemCol] || '')) : detectCodeSystem(code);
          const vsName = vsNameCol >= 0 ? String(row[vsNameCol] || '') : 'Codes';
          const oid = oidCol >= 0 ? String(row[oidCol] || '') : null;

          if (!currentVS.has(vsName)) {
            currentVS.set(vsName, {
              name: vsName,
              oid: oid,
              codeSystem: system,
              codes: [],
            });
          }

          currentVS.get(vsName)!.codes.push({
            code,
            display,
            system,
          });
        }

        data.valueSets.push(...currentVS.values());
      }
    }
  }

  return data;
}

/**
 * Parse PDF specification files using PDF.js
 */
async function parsePdfSpec(file: File): Promise<ParsedMeasureData> {
  const data: ParsedMeasureData = {
    measureId: null,
    title: null,
    description: null,
    measureType: 'process',
    steward: null,
    cbeNumber: null,
    version: null,
    populations: [],
    valueSets: [],
    codes: [],
    sections: [],
    warnings: [],
    ageRange: null,
    rationale: null,
    clinicalRecommendation: null,
    cqlDefinitions: {},
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // Parse the extracted text
    return parseTextContent(fullText, file.name);
  } catch (err) {
    data.warnings.push(`PDF parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    // Fall back to filename extraction
    return parseTextContent('', file.name);
  }
}

/**
 * Parse structured formats (XML, JSON)
 */
async function parseStructuredSpec(file: File, format: string): Promise<ParsedMeasureData> {
  const content = await file.text();

  const data: ParsedMeasureData = {
    measureId: null,
    title: null,
    description: null,
    measureType: 'process',
    steward: null,
    cbeNumber: null,
    version: null,
    populations: [],
    valueSets: [],
    codes: [],
    sections: [],
    warnings: [],
    ageRange: null,
    rationale: null,
    clinicalRecommendation: null,
    cqlDefinitions: {},
  };

  if (format === 'json') {
    try {
      const json = JSON.parse(content);
      // Handle FHIR Measure resource
      if (json.resourceType === 'Measure') {
        data.measureId = json.id || json.identifier?.[0]?.value;
        data.title = json.title || json.name;
        data.description = json.description;
        data.version = json.version;
        // Extract populations from group
        if (json.group) {
          for (const group of json.group) {
            for (const pop of group.population || []) {
              const popCode = pop.code?.coding?.[0]?.code;
              const popDesc = pop.description || pop.criteria?.expression;
              if (popCode && popDesc) {
                data.populations.push({
                  type: mapFhirPopulationType(popCode),
                  description: popDesc.substring(0, 200),
                  narrative: popDesc,
                  criteria: [],
                });
              }
            }
          }
        }
      }
    } catch (e) {
      data.warnings.push('Failed to parse JSON content');
    }
  } else if (format === 'xml') {
    // Basic XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // Try to extract common fields
    const titleEl = doc.querySelector('title, measureTitle, name');
    const descEl = doc.querySelector('description, measureDescription');
    const idEl = doc.querySelector('identifier, measureId, id');

    if (titleEl) data.title = titleEl.textContent || null;
    if (descEl) data.description = descEl.textContent || null;
    if (idEl) {
      const match = (idEl.textContent || '').match(/(\d+)/);
      if (match) data.measureId = match[1].padStart(3, '0');
    }
  }

  return data;
}

/**
 * Parse ZIP package (eCQM measure package)
 */
async function parseZipPackage(file: File): Promise<IngestionResult> {
  const warnings: string[] = [];
  const parsingNotes: string[] = ['Processing ZIP package...'];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find files by extension
    const files = Object.keys(zip.files);
    const htmlPath = files.find(f => f.toLowerCase().endsWith('.html') && !f.toLowerCase().includes('flow'));
    const xmlPath = files.find(f => f.toLowerCase().endsWith('.xml') && f.toLowerCase().includes('measure'));
    const jsonPath = files.find(f => f.toLowerCase().endsWith('.json') && f.toLowerCase().includes('measure'));

    // Parse the best available file
    if (htmlPath) {
      parsingNotes.push('Found HTML specification in package');
      const zipFile = zip.files[htmlPath];
      const content = await zipFile.async('string');
      const tempFile = new File([content], 'measure.html', { type: 'text/html' });
      const parsedData = await parseECQMHtml(tempFile);
      const ums = generateUMSFromParsedData(parsedData, file.name);
      return { success: true, ums, sections: [], warnings, parsingNotes };
    } else if (jsonPath) {
      parsingNotes.push('Found JSON specification in package');
      const zipFile = zip.files[jsonPath];
      const content = await zipFile.async('string');
      const tempFile = new File([content], 'measure.json', { type: 'application/json' });
      const parsedData = await parseStructuredSpec(tempFile, 'json');
      const ums = generateUMSFromParsedData(parsedData, file.name);
      return { success: true, ums, sections: [], warnings, parsingNotes };
    } else if (xmlPath) {
      parsingNotes.push('Found XML specification in package');
      const zipFile = zip.files[xmlPath];
      const content = await zipFile.async('string');
      const tempFile = new File([content], 'measure.xml', { type: 'application/xml' });
      const parsedData = await parseStructuredSpec(tempFile, 'xml');
      const ums = generateUMSFromParsedData(parsedData, file.name);
      return { success: true, ums, sections: [], warnings, parsingNotes };
    }

    warnings.push('No parseable specification found in ZIP package');
    return {
      success: false,
      ums: generateFallbackUMS(file.name),
      sections: [],
      warnings,
      parsingNotes,
    };
  } catch (error) {
    return {
      success: false,
      ums: generateFallbackUMS(file.name),
      sections: [],
      warnings: [`Error processing ZIP: ${error instanceof Error ? error.message : 'Unknown'}`],
      parsingNotes,
    };
  }
}

/**
 * Parse text content with pattern matching
 */
function parseTextContent(text: string, filename: string): ParsedMeasureData {
  const data: ParsedMeasureData = {
    measureId: null,
    title: null,
    description: null,
    measureType: 'process',
    steward: null,
    cbeNumber: null,
    version: null,
    populations: [],
    valueSets: [],
    codes: [],
    sections: [],
    warnings: [],
    ageRange: null,
    rationale: null,
    clinicalRecommendation: null,
    cqlDefinitions: {},
  };

  // Extract measure ID
  const idPatterns = [
    /CMS(\d{2,4})v?(\d+)?/gi,
    /measure[_\s-]?(\d{2,4})/gi,
    /eCQM[_\s-]?(\d{2,4})/gi,
  ];
  for (const pattern of idPatterns) {
    const match = pattern.exec(text) || pattern.exec(filename);
    if (match) {
      data.measureId = match[1].padStart(3, '0');
      break;
    }
  }

  // Extract title
  const titlePatterns = [
    /(?:title|measure\s+title)[:\s]+([^\n]+)/i,
    /^([A-Z][^.!\n]{10,100}(?:Screening|Exam|Assessment|Management|Control|Care|Treatment|Status)[^.!\n]*)/m,
  ];
  for (const pattern of titlePatterns) {
    const match = pattern.exec(text);
    if (match) {
      data.title = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // Extract description
  const descMatch = text.match(/(?:description)[:\s]+([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i) ||
                   text.match(/(?:percentage|proportion)\s+of\s+[^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*/i);
  if (descMatch) {
    data.description = descMatch[0].replace(/^description[:\s]+/i, '').trim();
  }

  // Extract populations
  const popPatterns = [
    { type: 'initial_population', pattern: /initial\s+population[:\s]+([^\n]+(?:\n(?![A-Z][a-z]+\s*(?:Population)?:)[^\n]+)*)/gi },
    { type: 'denominator', pattern: /(?:^|\n)denominator[:\s]+([^\n]+)/gi },
    { type: 'denominator_exclusion', pattern: /denominator\s+exclusion[s]?[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/gi },
    { type: 'numerator', pattern: /(?:^|\n)numerator[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/gi },
  ];

  for (const { type, pattern } of popPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const content = match[1]?.trim();
      if (content && content.length > 10 && !data.populations.find(p => p.type === type)) {
        data.populations.push({
          type,
          description: content.substring(0, 200),
          narrative: content,
          criteria: extractCriteriaFromText(content),
        });
      }
    }
  }

  // Extract age range
  const ageMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*years/i);
  if (ageMatch) {
    data.ageRange = { min: parseInt(ageMatch[1]), max: parseInt(ageMatch[2]) };
  }

  // Extract codes
  data.codes = extractClinicalCodes(text);

  // Extract value sets
  data.valueSets = extractValueSets(text);

  return data;
}

/**
 * Extract criteria from population description text
 */
function extractCriteriaFromText(text: string): string[] {
  const criteria: string[] = [];

  // Look for bullet points
  const bullets = text.match(/(?:^|\n)\s*[-•●]\s*([^\n]+)/gm);
  if (bullets) {
    criteria.push(...bullets.map(b => b.trim().replace(/^[-•●]\s*/, '')));
  }

  // Look for "OR" separated items
  const orItems = text.split(/\s+OR\s+/i);
  if (orItems.length > 1) {
    criteria.push(...orItems.map(item => item.trim().substring(0, 200)));
  }

  return criteria.filter(c => c.length > 5);
}

/**
 * Extract clinical codes from text
 */
function extractClinicalCodes(text: string): ParsedCode[] {
  const codes: ParsedCode[] = [];
  const found = new Set<string>();

  // ICD-10 codes
  const icd10 = text.matchAll(/\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/g);
  for (const match of icd10) {
    const code = match[1];
    if (!found.has(`ICD10-${code}`) && isValidICD10(code)) {
      found.add(`ICD10-${code}`);
      codes.push({ code, display: code, system: 'ICD10' });
    }
  }

  // CPT codes
  const cpt = text.matchAll(/\b(9\d{4}|[0-8]\d{4})\b/g);
  for (const match of cpt) {
    const code = match[1];
    if (!found.has(`CPT-${code}`) && isValidCPT(code)) {
      found.add(`CPT-${code}`);
      codes.push({ code, display: code, system: 'CPT' });
    }
  }

  // LOINC codes
  const loinc = text.matchAll(/\b(\d{4,5}-\d)\b/g);
  for (const match of loinc) {
    const code = match[1];
    if (!found.has(`LOINC-${code}`)) {
      found.add(`LOINC-${code}`);
      codes.push({ code, display: code, system: 'LOINC' });
    }
  }

  return codes;
}

/**
 * Extract value sets from text
 */
function extractValueSets(text: string): ParsedValueSet[] {
  const valueSets: ParsedValueSet[] = [];
  const foundOids = new Set<string>();

  // Pattern for OIDs with optional name
  const vsPattern = /(?:value\s*set)?[:\s]*([A-Za-z][^()\n]{5,50})?\s*(?:\((?:OID[:\s]*)?)?(\d+(?:\.\d+){5,})\)?/gi;
  const matches = text.matchAll(vsPattern);

  for (const match of matches) {
    const oid = match[2];
    if (!foundOids.has(oid)) {
      foundOids.add(oid);
      valueSets.push({
        name: match[1]?.trim() || `Value Set (${oid.substring(0, 20)}...)`,
        oid,
        codeSystem: null,
        codes: [],
      });
    }
  }

  return valueSets;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ParsedMeasureData {
  measureId: string | null;
  title: string | null;
  description: string | null;
  measureType: MeasureType;
  steward: string | null;
  cbeNumber: string | null;
  version: string | null;
  populations: ParsedPopulation[];
  valueSets: ParsedValueSet[];
  codes: ParsedCode[];
  sections: ParsedSection[];
  warnings: string[];
  ageRange: { min: number; max: number } | null;
  rationale: string | null;
  clinicalRecommendation: string | null;
  cqlDefinitions: Record<string, string>;
}

interface ParsedPopulation {
  type: string;
  description: string;
  narrative: string;
  criteria: string[];
}

interface ParsedValueSet {
  name: string;
  oid: string | null;
  codeSystem: CodeSystem | null;
  codes: ParsedCode[];
}

interface ParsedCode {
  code: string;
  display: string;
  system: CodeSystem;
}

function isValidICD10(code: string): boolean {
  return /^[A-TV-Z]\d{2}(\.\d{1,4})?$/.test(code);
}

function isValidCPT(code: string): boolean {
  const num = parseInt(code);
  return num >= 100 && num <= 99999;
}

function mapCodeSystem(systemStr: string): CodeSystem {
  const lower = systemStr.toLowerCase();
  if (lower.includes('icd') || lower.includes('10')) return 'ICD10';
  if (lower.includes('cpt')) return 'CPT';
  if (lower.includes('hcpcs')) return 'HCPCS';
  if (lower.includes('loinc')) return 'LOINC';
  if (lower.includes('snomed')) return 'SNOMED';
  if (lower.includes('rxnorm')) return 'RxNorm';
  if (lower.includes('cvx')) return 'CVX';
  return 'CPT'; // default
}

function detectCodeSystem(code: string): CodeSystem {
  if (/^[A-TV-Z]\d{2}/.test(code)) return 'ICD10';
  if (/^\d{4,5}-\d$/.test(code)) return 'LOINC';
  if (/^[A-Z]\d{4}$/.test(code)) return 'HCPCS';
  return 'CPT';
}

function mapFhirPopulationType(code: string): string {
  const map: Record<string, string> = {
    'initial-population': 'initial_population',
    'denominator': 'denominator',
    'denominator-exclusion': 'denominator_exclusion',
    'denominator-exception': 'denominator_exception',
    'numerator': 'numerator',
    'numerator-exclusion': 'numerator_exclusion',
  };
  return map[code] || code;
}

/**
 * Generate UMS from parsed data - outputs FHIR-aligned structure
 */
function generateUMSFromParsedData(data: ParsedMeasureData, filename: string): UniversalMeasureSpec {
  const id = `ums-${data.measureId || 'unknown'}-${Date.now()}`;
  const now = new Date().toISOString();
  const measureId = data.measureId ? `CMS${data.measureId}` : extractMeasureIdFromFilename(filename);

  // Generate populations
  const populations = data.populations.length > 0
    ? convertParsedPopulations(data)
    : generateDefaultPopulations(data);

  // Convert value sets with FHIR URLs
  const valueSets = convertParsedValueSets(data);

  // Calculate review progress
  let total = 0, approved = 0, pending = 0, flagged = 0;
  const countReviewStatus = (obj: any) => {
    if (obj?.reviewStatus) {
      total++;
      if (obj.reviewStatus === 'approved') approved++;
      else if (obj.reviewStatus === 'pending') pending++;
      else flagged++;
    }
    if (obj?.criteria) countReviewStatus(obj.criteria);
    if (obj?.children) obj.children.forEach(countReviewStatus);
  };
  populations.forEach(countReviewStatus);

  // Build globalConstraints from parsed data (single source of truth)
  const globalConstraints: UniversalMeasureSpec['globalConstraints'] = {};
  if (data.ageRange) {
    globalConstraints.ageRange = {
      min: data.ageRange.min,
      max: data.ageRange.max,
    };
  }

  return {
    id,
    resourceType: 'Measure', // FHIR alignment
    metadata: {
      measureId,
      title: data.title || extractTitleFromFilename(filename),
      version: data.version || '1.0',
      cbeNumber: data.cbeNumber || undefined,
      steward: data.steward || 'Unknown',
      program: 'MIPS_CQM',
      measureType: data.measureType,
      description: data.description || `Quality measure extracted from ${filename}`,
      rationale: data.rationale || undefined,
      clinicalRecommendation: data.clinicalRecommendation || undefined,
      submissionFrequency: 'Once per performance period',
      improvementNotation: data.measureType === 'outcome' ? 'decrease' : 'increase',
      scoring: 'proportion', // FHIR measure scoring
      url: `urn:uuid:${id}`, // FHIR canonical URL
      measurementPeriod: {
        start: '2025-01-01',
        end: '2025-12-31',
        inclusive: true,
      },
      lastUpdated: now,
      sourceDocuments: [filename],
    },
    globalConstraints: Object.keys(globalConstraints).length > 0 ? globalConstraints : undefined,
    populations,
    valueSets,
    status: 'in_progress',
    overallConfidence: calculateConfidence(data),
    reviewProgress: { total, approved, pending, flagged },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert internal population type to FHIR kebab-case
 */
function toFHIRPopulationType(type: string): PopulationType {
  const mapping: Record<string, PopulationType> = {
    'initial_population': 'initial-population',
    'denominator': 'denominator',
    'denominator_exclusion': 'denominator-exclusion',
    'denominator_exception': 'denominator-exception',
    'numerator': 'numerator',
    'numerator_exclusion': 'numerator-exclusion',
  };
  return mapping[type] || type as PopulationType;
}

/**
 * Get CQL definition name for a population type
 */
function getCQLDefinitionName(type: string): string {
  const mapping: Record<string, string> = {
    'initial_population': 'Initial Population',
    'initial-population': 'Initial Population',
    'denominator': 'Denominator',
    'denominator_exclusion': 'Denominator Exclusion',
    'denominator-exclusion': 'Denominator Exclusion',
    'denominator_exception': 'Denominator Exception',
    'denominator-exception': 'Denominator Exception',
    'numerator': 'Numerator',
    'numerator_exclusion': 'Numerator Exclusion',
    'numerator-exclusion': 'Numerator Exclusion',
  };
  return mapping[type] || type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function convertParsedPopulations(data: ParsedMeasureData): PopulationDefinition[] {
  const measureId = data.measureId || 'parsed';

  // Create a lookup map for value sets by name (case-insensitive)
  const vsMap = new Map<string, ParsedValueSet>();
  data.valueSets.forEach(vs => {
    vsMap.set(vs.name.toLowerCase(), vs);
    // Also index by partial name for fuzzy matching
    const words = vs.name.toLowerCase().split(/\s+/);
    if (words.length > 1) {
      vsMap.set(words.slice(0, 2).join(' '), vs);
    }
  });

  return data.populations.map((pop, idx) => {
    // Convert to FHIR kebab-case population type
    const fhirType = toFHIRPopulationType(pop.type);
    const cqlDefName = getCQLDefinitionName(pop.type);

    // Try multiple CQL definition name formats
    const popName = pop.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const cql = data.cqlDefinitions[popName] ||
                data.cqlDefinitions[pop.type] ||
                data.cqlDefinitions[cqlDefName] ||
                data.cqlDefinitions[popName.replace(/s$/, '')] || // Try singular
                '';

    // Extract value set references from CQL if available
    const children: DataElement[] = [];

    // For Initial Population, always add demographics if we have age range
    if (pop.type === 'initial_population') {
      // Add age demographic
      const ageRange = data.ageRange || extractAgeFromText(pop.narrative);
      if (ageRange) {
        children.push({
          id: `${pop.type}-age-${measureId}-${idx}`,
          type: 'demographic' as const,
          description: `Patient age ${ageRange.min} to ${ageRange.max} years`,
          thresholds: {
            ageMin: ageRange.min,
            ageMax: ageRange.max,
          },
          timingRequirements: [{
            description: 'At start of measurement period',
            relativeTo: 'measurement_period',
            confidence: 'high' as ConfidenceLevel,
          }],
          confidence: 'high' as ConfidenceLevel,
          reviewStatus: 'pending' as const,
        });
      }

      // Look for encounter requirements in narrative
      const encounterMatch = pop.narrative.match(/(?:qualifying|office|outpatient|face-to-face)\s+(?:visit|encounter)/gi);
      if (encounterMatch) {
        const encVs = findValueSetByKeywords(vsMap, ['encounter', 'office visit', 'outpatient']);
        children.push({
          id: `${pop.type}-enc-${measureId}-${idx}`,
          type: 'encounter' as const,
          description: 'Qualifying encounter during measurement period',
          valueSet: encVs ? {
            id: `vs-${data.valueSets.indexOf(encVs)}`,
            name: encVs.name,
            oid: encVs.oid || undefined,
            codes: encVs.codes,
            confidence: encVs.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
            totalCodeCount: encVs.codes.length,
          } : undefined,
          timingRequirements: [{
            description: 'During measurement period',
            relativeTo: 'measurement_period',
            confidence: 'high' as ConfidenceLevel,
          }],
          confidence: encVs?.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
          reviewStatus: 'pending' as const,
        });
      }
    }

    // Parse CQL to find value set references: [Type: "Value Set Name"]
    if (cql) {
      const cqlRefs = cql.matchAll(/\[([^\]]+):\s*"([^"]+)"\]/g);
      for (const ref of cqlRefs) {
        const criteriaType = ref[1].trim();
        const vsName = ref[2].trim();

        // Skip if we already added this (e.g., for demographics)
        if (children.some(c => c.description.toLowerCase().includes(vsName.toLowerCase()))) {
          continue;
        }

        // Find matching value set
        const vs = vsMap.get(vsName.toLowerCase()) || findValueSetByKeywords(vsMap, vsName.split(/\s+/));

        // Determine DataElement type from CQL criteria type
        let elemType: 'diagnosis' | 'encounter' | 'procedure' | 'observation' | 'medication' | 'demographic' | 'assessment' = 'assessment';
        if (criteriaType.includes('Condition') || criteriaType.includes('Diagnosis')) {
          elemType = 'diagnosis';
        } else if (criteriaType.includes('Encounter')) {
          elemType = 'encounter';
        } else if (criteriaType.includes('Procedure')) {
          elemType = 'procedure';
        } else if (criteriaType.includes('Observation') || criteriaType.includes('Laboratory') || criteriaType.includes('Assessment')) {
          elemType = 'observation';
        } else if (criteriaType.includes('Medication') || criteriaType.includes('Immunization')) {
          elemType = 'medication';
        }

        children.push({
          id: `${pop.type}-elem-${measureId}-${idx}-${children.length}`,
          type: elemType,
          description: `${criteriaType}: ${vsName}`,
          valueSet: vs ? {
            id: `vs-${data.valueSets.indexOf(vs)}`,
            name: vs.name,
            oid: vs.oid || undefined,
            codes: vs.codes,
            confidence: vs.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
            totalCodeCount: vs.codes.length,
          } : undefined,
          confidence: vs?.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
          reviewStatus: 'pending' as const,
        });
      }
    }

    // Parse narrative text for additional criteria patterns
    const narrativeCriteria = parseNarrativeForCriteria(pop.narrative, vsMap, data.valueSets, measureId, pop.type, idx, children.length);
    children.push(...narrativeCriteria);

    // If still no children, create structured items from criteria strings
    if (children.length === 0 && pop.criteria.length > 0) {
      pop.criteria.forEach((crit, cidx) => {
        const parsedCrit = parseCriterionText(crit, vsMap, data.valueSets, measureId, pop.type, idx, cidx);
        children.push(parsedCrit);
      });
    }

    // If still no children, try to parse the narrative into structured criteria
    if (children.length === 0 && pop.narrative) {
      const parsedNarrative = parseNarrativeIntoStructured(pop.narrative, vsMap, data.valueSets, measureId, pop.type, idx);
      if (parsedNarrative.length > 0) {
        children.push(...parsedNarrative);
      } else {
        // Last resort: create a single assessment from narrative
        children.push({
          id: `${pop.type}-narr-${measureId}-${idx}`,
          type: 'assessment' as const,
          description: pop.narrative.substring(0, 300),
          confidence: 'low' as ConfidenceLevel,
          reviewStatus: 'pending' as const,
        });
      }
    }

    return {
      id: `${fhirType}-${measureId}-${idx}`,
      type: fhirType, // FHIR kebab-case population type
      description: pop.description,
      narrative: pop.narrative,
      cqlDefinitionName: cqlDefName, // CQL expression reference
      expression: {
        language: 'text/cql-identifier' as const,
        expression: cqlDefName,
      },
      confidence: (children.some(c => c.valueSet) ? 'high' : 'medium') as ConfidenceLevel,
      reviewStatus: 'pending' as const,
      criteria: {
        id: `${fhirType}-criteria-${measureId}-${idx}`,
        operator: determineOperator(pop.narrative, pop.criteria),
        description: pop.description,
        confidence: 'high' as ConfidenceLevel,
        reviewStatus: 'pending' as const,
        children,
      },
      cqlDefinition: cql || undefined,
    };
  });
}

/**
 * Extract age range from text
 */
function extractAgeFromText(text: string): { min: number; max: number } | null {
  // Try various patterns
  const patterns = [
    /(?:age[d]?\s*)?(\d+)\s*(?:to|through|[-–])\s*(\d+)\s*(?:years|yrs)?/i,
    /(?:age[d]?\s*)(\d+)\s*(?:years|yrs)?\s*(?:and|or)\s*(?:older|above)/i,
    /(?:children|patients|individuals)\s*(?:age[d]?\s*)?(\d+)\s*(?:to|through|[-–])\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : 125; // Default max if "and older"
      return { min, max };
    }
  }
  return null;
}

/**
 * Find value set by keywords
 */
function findValueSetByKeywords(vsMap: Map<string, ParsedValueSet>, keywords: string[]): ParsedValueSet | undefined {
  const searchTerms = keywords.map(k => k.toLowerCase());

  for (const [name, vs] of vsMap) {
    if (searchTerms.some(term => name.includes(term))) {
      return vs;
    }
  }
  return undefined;
}

/**
 * Determine logical operator from text
 */
function determineOperator(narrative: string, criteria: string[]): 'AND' | 'OR' | 'NOT' {
  const text = narrative.toLowerCase();

  // Check for OR patterns
  if (text.includes(' or ') && !text.includes(' and ')) {
    return 'OR';
  }
  // Check for exclusion patterns
  if (text.includes('exclude') || text.includes('except')) {
    return 'AND'; // Exclusions typically use AND
  }
  // If multiple criteria with "or" between them
  if (criteria.length > 1 && criteria.some(c => c.toLowerCase().startsWith('or '))) {
    return 'OR';
  }

  return 'AND';
}

/**
 * Parse narrative text for criteria patterns
 */
function parseNarrativeForCriteria(
  narrative: string,
  vsMap: Map<string, ParsedValueSet>,
  allValueSets: ParsedValueSet[],
  measureId: string,
  popType: string,
  popIdx: number,
  startIdx: number
): DataElement[] {
  const children: DataElement[] = [];
  let childIdx = startIdx;

  // Pattern: "with [condition] using [value set]"
  const withPattern = /with\s+(?:a\s+)?(?:diagnosis\s+of\s+)?([^,]+?)(?:\s+using\s+"([^"]+)")?/gi;
  let match;
  while ((match = withPattern.exec(narrative)) !== null) {
    const condition = match[1].trim();
    const vsName = match[2];

    // Skip if too short or common words
    if (condition.length < 5 || /^(the|and|or|a|an)$/i.test(condition)) continue;

    const vs = vsName ? vsMap.get(vsName.toLowerCase()) : findValueSetByKeywords(vsMap, condition.split(/\s+/));

    children.push({
      id: `${popType}-crit-${measureId}-${popIdx}-${childIdx++}`,
      type: vs ? 'diagnosis' as const : 'assessment' as const,
      description: condition,
      valueSet: vs ? {
        id: `vs-${allValueSets.indexOf(vs)}`,
        name: vs.name,
        oid: vs.oid || undefined,
        codes: vs.codes,
        confidence: vs.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
        totalCodeCount: vs.codes.length,
      } : undefined,
      confidence: vs?.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
      reviewStatus: 'pending' as const,
    });
  }

  // Pattern: specific clinical terms with potential value sets
  const clinicalTerms = [
    { pattern: /(?:hospice|palliative)\s+care/gi, type: 'procedure' as const },
    { pattern: /(?:immunodeficiency|HIV|AIDS)/gi, type: 'diagnosis' as const },
    { pattern: /(?:cancer|leukemia|lymphoma|myeloma)/gi, type: 'diagnosis' as const },
    { pattern: /(?:screening|exam|test|assessment)\s+(?:performed|completed)/gi, type: 'procedure' as const },
  ];

  for (const { pattern, type } of clinicalTerms) {
    const matches = narrative.matchAll(pattern);
    for (const m of matches) {
      const term = m[0];
      const vs = findValueSetByKeywords(vsMap, term.split(/\s+/));

      // Don't duplicate
      if (children.some(c => c.description.toLowerCase().includes(term.toLowerCase()))) continue;

      children.push({
        id: `${popType}-term-${measureId}-${popIdx}-${childIdx++}`,
        type,
        description: term,
        valueSet: vs ? {
          id: `vs-${allValueSets.indexOf(vs)}`,
          name: vs.name,
          oid: vs.oid || undefined,
          codes: vs.codes,
          confidence: vs.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
          totalCodeCount: vs.codes.length,
        } : undefined,
        confidence: vs?.oid ? 'high' as ConfidenceLevel : 'low' as ConfidenceLevel,
        reviewStatus: 'pending' as const,
      });
    }
  }

  return children;
}

/**
 * Parse a single criterion text into structured DataElement
 */
function parseCriterionText(
  text: string,
  vsMap: Map<string, ParsedValueSet>,
  allValueSets: ParsedValueSet[],
  measureId: string,
  popType: string,
  popIdx: number,
  critIdx: number
): DataElement {
  // Determine type based on keywords
  let type: DataElement['type'] = 'assessment';
  if (/diagnosis|condition|disease/i.test(text)) type = 'diagnosis';
  else if (/encounter|visit/i.test(text)) type = 'encounter';
  else if (/procedure|surgery|intervention/i.test(text)) type = 'procedure';
  else if (/observation|test|result|lab/i.test(text)) type = 'observation';
  else if (/medication|drug|immunization|vaccine/i.test(text)) type = 'medication';
  else if (/age|gender|sex/i.test(text)) type = 'demographic';

  // Try to find a matching value set
  const vs = findValueSetByKeywords(vsMap, text.split(/\s+/).filter(w => w.length > 3));

  return {
    id: `${popType}-crit-${measureId}-${popIdx}-${critIdx}`,
    type,
    description: text,
    valueSet: vs ? {
      id: `vs-${allValueSets.indexOf(vs)}`,
      name: vs.name,
      oid: vs.oid || undefined,
      codes: vs.codes,
      confidence: vs.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
      totalCodeCount: vs.codes.length,
    } : undefined,
    confidence: vs?.oid ? 'high' as ConfidenceLevel : 'medium' as ConfidenceLevel,
    reviewStatus: 'pending' as const,
  };
}

/**
 * Parse narrative into structured criteria (last resort)
 */
function parseNarrativeIntoStructured(
  narrative: string,
  vsMap: Map<string, ParsedValueSet>,
  allValueSets: ParsedValueSet[],
  measureId: string,
  popType: string,
  popIdx: number
): DataElement[] {
  const children: DataElement[] = [];

  // Split by common delimiters
  const parts = narrative.split(/(?:\s+OR\s+|\s+-\s+|[\n•●])/i).filter(p => p.trim().length > 10);

  parts.forEach((part, idx) => {
    const trimmed = part.trim();
    if (trimmed.length < 10) return;

    // Try to classify and link to value set
    const elem = parseCriterionText(trimmed, vsMap, allValueSets, measureId, popType, popIdx, idx);
    children.push(elem);
  });

  return children;
}

function convertParsedValueSets(data: ParsedMeasureData): ValueSetReference[] {
  const measureId = data.measureId || 'parsed';

  return data.valueSets.map((vs, idx) => ({
    id: `vs-${idx}-${measureId}`,
    name: vs.name,
    oid: vs.oid || undefined,
    // Add FHIR canonical URL from OID
    url: vs.oid ? `http://cts.nlm.nih.gov/fhir/ValueSet/${vs.oid}` : undefined,
    confidence: (vs.oid ? 'high' : 'medium') as ConfidenceLevel,
    source: 'Parsed',
    verified: false,
    // Add FHIR system URIs to codes
    codes: vs.codes.map(code => ({
      ...code,
      systemUri: getCodeSystemUrl(code.system),
    })),
    totalCodeCount: vs.codes.length,
  }));
}

function generateDefaultPopulations(data: ParsedMeasureData): PopulationDefinition[] {
  const measureId = data.measureId || 'default';
  const ageRange = data.ageRange || { min: 18, max: 85 };

  return [
    {
      id: `initial-population-${measureId}`,
      type: 'initial-population', // FHIR kebab-case
      description: `Patients aged ${ageRange.min}-${ageRange.max} with qualifying encounters`,
      narrative: data.description || 'Patients meeting age and encounter requirements.',
      cqlDefinitionName: 'Initial Population',
      expression: {
        language: 'text/cql-identifier' as const,
        expression: 'Initial Population',
      },
      confidence: 'medium',
      reviewStatus: 'pending',
      criteria: {
        id: `initial-population-criteria-${measureId}`,
        operator: 'AND',
        description: 'All conditions must be met',
        confidence: 'medium',
        reviewStatus: 'pending',
        children: [],
      },
    },
    {
      id: `denominator-${measureId}`,
      type: 'denominator',
      description: 'Equals Initial Population',
      narrative: 'All patients in the Initial Population.',
      cqlDefinitionName: 'Denominator',
      expression: {
        language: 'text/cql-identifier' as const,
        expression: 'Denominator',
      },
      confidence: 'high',
      reviewStatus: 'pending',
      criteria: {
        id: `denominator-criteria-${measureId}`,
        operator: 'AND',
        description: 'Equals Initial Population',
        confidence: 'high',
        reviewStatus: 'pending',
        children: [],
      },
    },
    {
      id: `numerator-${measureId}`,
      type: 'numerator',
      description: 'Patients meeting quality action',
      narrative: 'Patients with documented evidence of the quality action.',
      cqlDefinitionName: 'Numerator',
      expression: {
        language: 'text/cql-identifier' as const,
        expression: 'Numerator',
      },
      confidence: 'medium',
      reviewStatus: 'pending',
      criteria: {
        id: `numerator-criteria-${measureId}`,
        operator: 'AND',
        description: 'Quality action performed',
        confidence: 'medium',
        reviewStatus: 'pending',
        children: [],
      },
    },
  ];
}

function calculateConfidence(data: ParsedMeasureData): ConfidenceLevel {
  let score = 0;
  if (data.measureId) score += 2;
  if (data.title && data.title.length > 10) score += 2;
  if (data.description && data.description.length > 50) score += 2;
  if (data.populations.length >= 3) score += 2;
  if (data.valueSets.length > 0) score += 1;
  if (data.codes.length > 5) score += 1;
  if (data.ageRange) score += 1;

  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function extractMeasureIdFromFilename(filename: string): string {
  const match = filename.match(/(\d{2,4})/);
  return match ? `CMS${match[1].padStart(3, '0')}` : 'CMS000';
}

function extractTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.(pdf|xlsx?|html?|txt|cql|csv|xml|json|zip)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\d{4}/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled Measure';
}

function generateFallbackUMS(filename: string): UniversalMeasureSpec {
  const now = new Date().toISOString();
  const measureId = extractMeasureIdFromFilename(filename).replace('CMS', '');

  return {
    id: `ums-fallback-${Date.now()}`,
    metadata: {
      measureId: `CMS${measureId}`,
      title: extractTitleFromFilename(filename),
      version: '1.0',
      steward: 'Unknown',
      program: 'MIPS_CQM',
      measureType: 'process',
      description: `Quality measure from ${filename}. Manual review required.`,
      rationale: 'Unable to extract rationale.',
      clinicalRecommendation: 'Unable to extract clinical recommendation.',
      submissionFrequency: 'Once per performance period',
      improvementNotation: 'increase',
      measurementPeriod: {
        start: '2025-01-01',
        end: '2025-12-31',
        inclusive: true,
      },
      lastUpdated: now,
      sourceDocuments: [filename],
    },
    populations: [],
    valueSets: [],
    status: 'in_progress',
    overallConfidence: 'low',
    reviewProgress: { total: 0, approved: 0, pending: 0, flagged: 0 },
    createdAt: now,
    updatedAt: now,
  };
}
