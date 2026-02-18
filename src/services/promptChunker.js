/**
 * Prompt Chunker Service (P2 1.A)
 *
 * Intelligently chunks large measure documents for optimal LLM extraction.
 * Handles documents that exceed context limits by:
 *   1. Detecting document structure (sections, populations, value sets)
 *   2. Splitting at semantic boundaries
 *   3. Preserving context across chunks with overlapping headers
 *   4. Reassembling results with deduplication
 *
 * Key insight: Measure documents have predictable structure (metadata, populations,
 * value sets, supplemental data). We chunk along these boundaries rather than
 * arbitrarily splitting mid-paragraph.
 */

                                                          

// ============================================================================
// TYPES
// ============================================================================

                                  
                                                                      
                       
                                                              
                      
                                                          
                           
                                                                       
                       
 

                                
                              
                
                               
                
                          
                  
                                              
                      
                             
                    
                                             
                           
                                          
                        
 

                         
              
                        
                 
                           
                           
               
                         
                
                       
                             
                     
              

                               
                    
                      
                    
                   
 

                                 
                            
                          
                              
                      
                                    
                               
                                    
                      
 

                                    
                            
                     
                               
                 
                              
                           
                                                    
                                                
 

                              
                                 
                               
                                              
                                    
                                            
                             
 

                                     
                                                                            
                                                                        
 

                                
                
                                                             
                                             
 

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

export const DEFAULT_CHUNKING_OPTIONS                  = {
  maxChunkSize: 100000,
  overlapSize: 2000,
  preserveHeaders: true,
  minChunkSize: 5000,
};

// ============================================================================
// SECTION DETECTION
// ============================================================================

/**
 * Patterns for detecting section boundaries in measure documents.
 * These are based on common eCQM, HEDIS, and MIPS document formats.
 */
const SECTION_PATTERNS                                                = [
  // Populations
  { pattern: /^#+\s*Initial\s+Population/im, type: 'initial_population' },
  { pattern: /^Initial\s+Population\s*[:=]/im, type: 'initial_population' },
  { pattern: /^\*\*Initial\s+Population\*\*/im, type: 'initial_population' },

  { pattern: /^#+\s*Denominator\s*$/im, type: 'denominator' },
  { pattern: /^Denominator\s*[:=]/im, type: 'denominator' },
  { pattern: /^\*\*Denominator\*\*\s*$/im, type: 'denominator' },

  { pattern: /^#+\s*Denominator\s+Exclusion/im, type: 'denominator_exclusion' },
  { pattern: /^Denominator\s+Exclusion[s]?\s*[:=]/im, type: 'denominator_exclusion' },
  { pattern: /^\*\*Denominator\s+Exclusion/im, type: 'denominator_exclusion' },

  { pattern: /^#+\s*Denominator\s+Exception/im, type: 'denominator_exception' },
  { pattern: /^Denominator\s+Exception[s]?\s*[:=]/im, type: 'denominator_exception' },
  { pattern: /^\*\*Denominator\s+Exception/im, type: 'denominator_exception' },

  { pattern: /^#+\s*Numerator\s*$/im, type: 'numerator' },
  { pattern: /^Numerator\s*[:=]/im, type: 'numerator' },
  { pattern: /^\*\*Numerator\*\*\s*$/im, type: 'numerator' },

  { pattern: /^#+\s*Numerator\s+Exclusion/im, type: 'numerator_exclusion' },
  { pattern: /^Numerator\s+Exclusion[s]?\s*[:=]/im, type: 'numerator_exclusion' },

  // Value Sets
  { pattern: /^#+\s*Value\s+Set[s]?/im, type: 'value_sets' },
  { pattern: /^Value\s+Set[s]?\s*[:=]/im, type: 'value_sets' },
  { pattern: /^#+\s*Terminology/im, type: 'value_sets' },
  { pattern: /^#+\s*Code\s+Systems?/im, type: 'value_sets' },
  { pattern: /^\*\*Value\s+Sets?\*\*/im, type: 'value_sets' },

  // Supplemental Data
  { pattern: /^#+\s*Supplemental\s+Data/im, type: 'supplemental_data' },
  { pattern: /^Supplemental\s+Data\s+Elements?\s*[:=]/im, type: 'supplemental_data' },

  // Clinical Recommendation
  { pattern: /^#+\s*Clinical\s+Recommendation/im, type: 'clinical_recommendation' },
  { pattern: /^Clinical\s+Recommendation\s*[:=]/im, type: 'clinical_recommendation' },

  // CQL
  { pattern: /^#+\s*CQL\s+Definitions?/im, type: 'cql_definitions' },
  { pattern: /^library\s+\w+\s+version/im, type: 'cql_definitions' },
  { pattern: /^define\s+["']?\w+["']?\s*:/im, type: 'cql_definitions' },

  // Metadata (usually at the top)
  { pattern: /^#+\s*Measure\s+Information/im, type: 'metadata' },
  { pattern: /^CMS\d+v\d+/im, type: 'metadata' },
  { pattern: /^Measure\s+ID\s*[:=]/im, type: 'metadata' },
  { pattern: /^#+\s*Description/im, type: 'metadata' },
  { pattern: /^#+\s*Rationale/im, type: 'metadata' },
];

/**
 * Detect all section boundaries in a document.
 */
export function detectSections(content        )                 {
  const sections                 = [];
  const lines = content.split('\n');
  let currentOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;

    for (const { pattern, type } of SECTION_PATTERNS) {
      if (pattern.test(line)) {
        // Find the end of this section (next section start or EOF)
        let endOffset = content.length;
        let searchStart = lineStart + line.length;

        // Look for the next section header
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const isNextSection = SECTION_PATTERNS.some(p => p.pattern.test(nextLine));
          if (isNextSection) {
            endOffset = searchStart;
            break;
          }
          searchStart += nextLine.length + 1; // +1 for newline
        }

        sections.push({
          type,
          startOffset: lineStart,
          endOffset,
          heading: line.trim(),
        });
        break;
      }
    }

    currentOffset += line.length + 1; // +1 for newline
  }

  // Sort by start offset and merge overlapping sections of same type
  sections.sort((a, b) => a.startOffset - b.startOffset);

  return sections;
}

/**
 * Analyze document structure for chunking strategy.
 */
export function analyzeDocumentStructure(content        )                    {
  const sections = detectSections(content);

  // Try to extract measure ID and title from the beginning
  const measureIdMatch = content.match(/CMS(\d+)v(\d+)/i);
  const measureId = measureIdMatch ? `CMS${measureIdMatch[1]}v${measureIdMatch[2]}` : undefined;

  // Look for title in first few lines or after "Title:" pattern
  const titleMatch = content.match(/^#+\s*(.+?)\s*$/m) ||
                     content.match(/Title\s*[:=]\s*(.+)/i) ||
                     content.match(/Measure\s+Title\s*[:=]\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // Estimate complexity
  let complexity                                   ;
  if (sections.length <= 4) {
    complexity = 'simple';
  } else if (sections.length <= 8) {
    complexity = 'moderate';
  } else {
    complexity = 'complex';
  }

  return {
    measureId,
    title,
    sections,
    complexity,
  };
}

// ============================================================================
// CHUNKING LOGIC
// ============================================================================

/**
 * Find the best split point near a target offset.
 * Prefers section boundaries, then paragraph breaks, then sentence breaks.
 */
function findBestSplitPoint(
  content        ,
  targetOffset        ,
  sections                ,
  searchRange         = 5000
)         {
  const minOffset = Math.max(0, targetOffset - searchRange);
  const maxOffset = Math.min(content.length, targetOffset + searchRange);

  // 1. Try to split at a section boundary
  for (const section of sections) {
    if (section.startOffset >= minOffset && section.startOffset <= maxOffset) {
      return section.startOffset;
    }
  }

  // 2. Try to split at a paragraph break (double newline)
  const searchText = content.substring(minOffset, maxOffset);
  const paragraphBreaks = [...searchText.matchAll(/\n\n+/g)];
  if (paragraphBreaks.length > 0) {
    // Find the break closest to target
    let bestBreak = paragraphBreaks[0];
    let bestDistance = Math.abs((paragraphBreaks[0].index || 0) + minOffset - targetOffset);
    for (const br of paragraphBreaks) {
      const breakOffset = (br.index || 0) + minOffset;
      const distance = Math.abs(breakOffset - targetOffset);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestBreak = br;
      }
    }
    return (bestBreak.index || 0) + minOffset + bestBreak[0].length;
  }

  // 3. Try to split at a sentence break
  const sentenceBreaks = [...searchText.matchAll(/[.!?]\s+/g)];
  if (sentenceBreaks.length > 0) {
    let bestBreak = sentenceBreaks[0];
    let bestDistance = Math.abs((sentenceBreaks[0].index || 0) + minOffset - targetOffset);
    for (const br of sentenceBreaks) {
      const breakOffset = (br.index || 0) + minOffset;
      const distance = Math.abs(breakOffset - targetOffset);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestBreak = br;
      }
    }
    return (bestBreak.index || 0) + minOffset + bestBreak[0].length;
  }

  // 4. Fall back to target offset
  return targetOffset;
}

/**
 * Build a context header to prepend to each chunk.
 * Includes measure ID, title, and previous section headings.
 */
function buildContextHeader(
  structure                   ,
  chunkIndex        ,
  totalChunks        ,
  previousSections                
)         {
  const lines           = [];

  lines.push(`[DOCUMENT CHUNK ${chunkIndex + 1} OF ${totalChunks}]`);

  if (structure.measureId) {
    lines.push(`Measure ID: ${structure.measureId}`);
  }
  if (structure.title) {
    lines.push(`Measure Title: ${structure.title}`);
  }

  if (chunkIndex > 0 && previousSections.length > 0) {
    lines.push('Previous sections in document:');
    for (const section of previousSections.slice(-5)) {
      lines.push(`  - ${section.type}: ${section.heading || '(no heading)'}`);
    }
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Get sections that appear before a given offset.
 */
function getSectionsBefore(sections                , offset        )                 {
  return sections.filter(s => s.startOffset < offset);
}

/**
 * Get sections that overlap with a given range.
 */
function getSectionsInRange(
  sections                ,
  startOffset        ,
  endOffset        
)                 {
  return sections.filter(s =>
    (s.startOffset >= startOffset && s.startOffset < endOffset) ||
    (s.endOffset > startOffset && s.endOffset <= endOffset) ||
    (s.startOffset <= startOffset && s.endOffset >= endOffset)
  );
}

/**
 * Chunk a document for LLM extraction.
 *
 * Uses semantic boundaries (sections, paragraphs) to split documents
 * while preserving context with overlapping headers.
 */
export function chunkDocument(
  content        ,
  options                           = {}
)                 {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const structure = analyzeDocumentStructure(content);

  // If document is small enough, don't chunk
  if (content.length <= opts.maxChunkSize) {
    return {
      chunks: [{
        index: 0,
        total: 1,
        content,
        startOffset: 0,
        endOffset: content.length,
        sections: structure.sections,
        contextHeader: '',
      }],
      totalLength: content.length,
      structure,
      wasChunked: false,
    };
  }

  const chunks                  = [];
  let currentOffset = 0;

  while (currentOffset < content.length) {
    // Calculate target end for this chunk
    let targetEnd = currentOffset + opts.maxChunkSize;

    // Find best split point
    let chunkEnd        ;
    if (targetEnd >= content.length) {
      chunkEnd = content.length;
    } else {
      chunkEnd = findBestSplitPoint(content, targetEnd, structure.sections);
    }

    // Ensure chunk is not too small (combine with previous if needed)
    const chunkSize = chunkEnd - currentOffset;
    if (chunkSize < opts.minChunkSize && chunks.length > 0 && currentOffset > 0) {
      // Extend previous chunk instead
      const prevChunk = chunks[chunks.length - 1];
      prevChunk.endOffset = chunkEnd;
      prevChunk.content = content.substring(prevChunk.startOffset, chunkEnd);
      prevChunk.sections = getSectionsInRange(
        structure.sections,
        prevChunk.startOffset,
        chunkEnd
      );
      currentOffset = chunkEnd;
      continue;
    }

    // Build context header
    const previousSections = getSectionsBefore(structure.sections, currentOffset);
    const contextHeader = opts.preserveHeaders
      ? buildContextHeader(structure, chunks.length, -1, previousSections) // -1 = unknown total
      : '';

    // Extract chunk content
    const chunkContent = content.substring(currentOffset, chunkEnd);
    const chunkSections = getSectionsInRange(structure.sections, currentOffset, chunkEnd);

    chunks.push({
      index: chunks.length,
      total: -1, // Will be updated after all chunks created
      content: contextHeader + chunkContent,
      startOffset: currentOffset,
      endOffset: chunkEnd,
      sections: chunkSections,
      contextHeader,
    });

    // Move to next chunk with overlap
    currentOffset = Math.max(currentOffset + 1, chunkEnd - opts.overlapSize);
  }

  // Update total count and context headers
  const totalChunks = chunks.length;
  for (const chunk of chunks) {
    chunk.total = totalChunks;
    // Rebuild context header with correct total
    if (opts.preserveHeaders) {
      const previousSections = getSectionsBefore(structure.sections, chunk.startOffset);
      const newHeader = buildContextHeader(structure, chunk.index, totalChunks, previousSections);
      chunk.content = newHeader + chunk.content.substring(chunk.contextHeader.length);
      chunk.contextHeader = newHeader;
    }
  }

  return {
    chunks,
    totalLength: content.length,
    structure,
    wasChunked: true,
  };
}

// ============================================================================
// RESULT MERGING
// ============================================================================

/**
 * Merge extraction results from multiple chunks.
 *
 * Handles:
 *   - Deduplication of populations by type
 *   - Deduplication of value sets by OID
 *   - Conflict resolution for metadata fields
 *   - Combining criteria from overlapping chunks
 */
export function mergeChunkResults(
  results                                                                   
)              {
  if (results.length === 0) {
    throw new Error('No results to merge');
  }

  if (results.length === 1) {
    return {
      merged: results[0].extraction,
      contributions: {
        populations: {},
        valueSets: {},
      },
      conflicts: [],
    };
  }

  const contributions                     = {
    populations: {},
    valueSets: {},
  };
  const conflicts                  = [];

  // Use first result as base, then merge in others
  const base = { ...results[0].extraction };
  const merged                       = {
    ...base,
    populations: [],
    valueSets: [],
  };

  // Merge metadata (use longest/most complete values)
  for (const { extraction } of results) {
    if (extraction.title && extraction.title.length > (merged.title?.length || 0)) {
      merged.title = extraction.title;
    }
    if (extraction.description && extraction.description.length > (merged.description?.length || 0)) {
      merged.description = extraction.description;
    }
    if (extraction.rationale && extraction.rationale.length > (merged.rationale?.length || 0)) {
      merged.rationale = extraction.rationale;
    }
    if (extraction.clinicalRecommendation && extraction.clinicalRecommendation.length > (merged.clinicalRecommendation?.length || 0)) {
      merged.clinicalRecommendation = extraction.clinicalRecommendation;
    }
    if (extraction.cbeNumber && !merged.cbeNumber) {
      merged.cbeNumber = extraction.cbeNumber;
    }
  }

  // Merge populations by type
  const populationsByType = new Map                                                 ();

  for (let i = 0; i < results.length; i++) {
    const { extraction } = results[i];
    for (const pop of extraction.populations || []) {
      const existing = populationsByType.get(pop.type) || [];
      existing.push({ pop, chunkIndex: i });
      populationsByType.set(pop.type, existing);
    }
  }

  // For each population type, merge all instances
  for (const [type, instances] of populationsByType) {
    contributions.populations[type] = instances.map(i => i.chunkIndex);

    if (instances.length === 1) {
      merged.populations.push(instances[0].pop);
    } else {
      // Merge criteria from all instances
      const mergedPop = { ...instances[0].pop };
      const allCriteria        = [];
      const criteriaDescriptions = new Set        ();

      for (const { pop } of instances) {
        for (const crit of pop.criteria || []) {
          const key = `${crit.type}|${crit.description}|${crit.valueSetOid || ''}`;
          if (!criteriaDescriptions.has(key)) {
            criteriaDescriptions.add(key);
            allCriteria.push(crit);
          }
        }
      }

      mergedPop.criteria = allCriteria;

      // Use longest narrative
      const longestNarrative = instances
        .map(i => i.pop.narrative || '')
        .sort((a, b) => b.length - a.length)[0];
      mergedPop.narrative = longestNarrative;

      merged.populations.push(mergedPop);
    }
  }

  // Merge value sets by OID (deduplicate)
  const valueSetsByOid = new Map                                                ();
  const valueSetsByName = new Map                                                ();

  for (let i = 0; i < results.length; i++) {
    const { extraction } = results[i];
    for (const vs of extraction.valueSets || []) {
      if (vs.oid) {
        const existing = valueSetsByOid.get(vs.oid) || [];
        existing.push({ vs, chunkIndex: i });
        valueSetsByOid.set(vs.oid, existing);
      } else {
        const key = vs.name.toLowerCase().trim();
        const existing = valueSetsByName.get(key) || [];
        existing.push({ vs, chunkIndex: i });
        valueSetsByName.set(key, existing);
      }
    }
  }

  // Merge value sets with OIDs
  for (const [oid, instances] of valueSetsByOid) {
    contributions.valueSets[oid] = instances.map(i => i.chunkIndex);

    if (instances.length === 1) {
      merged.valueSets.push(instances[0].vs);
    } else {
      // Merge codes from all instances
      const mergedVS = { ...instances[0].vs };
      const allCodes        = [];
      const codeKeys = new Set        ();

      for (const { vs } of instances) {
        for (const code of vs.codes || []) {
          const key = `${code.code}|${code.system}`;
          if (!codeKeys.has(key)) {
            codeKeys.add(key);
            allCodes.push(code);
          }
        }
      }

      mergedVS.codes = allCodes;
      merged.valueSets.push(mergedVS);
    }
  }

  // Add value sets without OIDs (dedupe by name)
  for (const [_name, instances] of valueSetsByName) {
    if (instances.length === 1) {
      merged.valueSets.push(instances[0].vs);
    } else {
      // Use the one with the most codes
      const best = instances.sort((a, b) => (b.vs.codes?.length || 0) - (a.vs.codes?.length || 0))[0];
      merged.valueSets.push(best.vs);
    }
  }

  // Merge supplemental data
  const supplementalSet = new Set        ();
  for (const { extraction } of results) {
    for (const sd of extraction.supplementalData || []) {
      supplementalSet.add(sd);
    }
  }
  merged.supplementalData = Array.from(supplementalSet);

  return {
    merged,
    contributions,
    conflicts,
  };
}

// ============================================================================
// SPECIALIZED CHUNKING STRATEGIES
// ============================================================================

/**
 * Chunk a document with a focus on value set extraction.
 *
 * Identifies the value set section and ensures it gets its own chunk
 * with full context for code extraction.
 */
export function chunkForValueSetExtraction(
  content        ,
  options                           = {}
)                 {
  const structure = analyzeDocumentStructure(content);

  // Find value set section
  const valueSetSection = structure.sections.find(s => s.type === 'value_sets');

  if (!valueSetSection) {
    // No dedicated value set section, use standard chunking
    return chunkDocument(content, options);
  }

  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  // If value set section fits in one chunk, create focused chunks
  const valueSetContent = content.substring(valueSetSection.startOffset, valueSetSection.endOffset);
  if (valueSetContent.length <= opts.maxChunkSize * 0.8) {
    // Create two chunks: one for populations, one for value sets
    const chunks                  = [];

    // Chunk 1: Everything before value sets
    if (valueSetSection.startOffset > 0) {
      const beforeContent = content.substring(0, valueSetSection.startOffset);
      chunks.push({
        index: 0,
        total: 2,
        content: beforeContent,
        startOffset: 0,
        endOffset: valueSetSection.startOffset,
        sections: structure.sections.filter(s => s.startOffset < valueSetSection.startOffset),
        contextHeader: '',
      });
    }

    // Chunk 2: Value sets (with context header)
    const contextHeader = `[VALUE SET EXTRACTION CHUNK]\nMeasure ID: ${structure.measureId || 'Unknown'}\nFocus: Extract ALL value sets with COMPLETE code lists.\n---\n\n`;
    chunks.push({
      index: chunks.length,
      total: chunks.length + 1,
      content: contextHeader + valueSetContent,
      startOffset: valueSetSection.startOffset,
      endOffset: valueSetSection.endOffset,
      sections: [valueSetSection],
      contextHeader,
    });

    // Update totals
    for (const chunk of chunks) {
      chunk.total = chunks.length;
    }

    return {
      chunks,
      totalLength: content.length,
      structure,
      wasChunked: chunks.length > 1,
    };
  }

  // Value set section is large, use standard chunking
  return chunkDocument(content, options);
}

/**
 * Chunk a document with a focus on population extraction.
 *
 * Creates one chunk per population type for detailed extraction.
 */
export function chunkForPopulationExtraction(
  content        ,
  options                           = {}
)                 {
  const structure = analyzeDocumentStructure(content);
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  // Find all population sections
  const populationSections = structure.sections.filter(s =>
    ['initial_population', 'denominator', 'denominator_exclusion',
     'denominator_exception', 'numerator', 'numerator_exclusion'].includes(s.type)
  );

  if (populationSections.length === 0) {
    // No detected population sections, use standard chunking
    return chunkDocument(content, options);
  }

  // If total population content is small, keep it together
  const totalPopulationLength = populationSections.reduce(
    (sum, s) => sum + (s.endOffset - s.startOffset),
    0
  );

  if (totalPopulationLength <= opts.maxChunkSize) {
    return chunkDocument(content, options);
  }

  // Create one chunk per population with shared context
  const chunks                  = [];

  // First chunk: metadata only
  const firstPopStart = populationSections[0].startOffset;
  if (firstPopStart > opts.minChunkSize) {
    chunks.push({
      index: 0,
      total: -1,
      content: content.substring(0, firstPopStart),
      startOffset: 0,
      endOffset: firstPopStart,
      sections: structure.sections.filter(s => s.startOffset < firstPopStart),
      contextHeader: '',
    });
  }

  // One chunk per population
  for (const section of populationSections) {
    const sectionContent = content.substring(section.startOffset, section.endOffset);
    const contextHeader = buildContextHeader(
      structure,
      chunks.length,
      -1,
      structure.sections.filter(s => s.startOffset < section.startOffset)
    );

    chunks.push({
      index: chunks.length,
      total: -1,
      content: contextHeader + sectionContent,
      startOffset: section.startOffset,
      endOffset: section.endOffset,
      sections: [section],
      contextHeader,
    });
  }

  // Update totals
  for (const chunk of chunks) {
    chunk.total = chunks.length;
  }

  return {
    chunks,
    totalLength: content.length,
    structure,
    wasChunked: chunks.length > 1,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  chunkDocument,
  mergeChunkResults,
  analyzeDocumentStructure,
  detectSections,
  chunkForValueSetExtraction,
  chunkForPopulationExtraction,
  DEFAULT_CHUNKING_OPTIONS,
};
