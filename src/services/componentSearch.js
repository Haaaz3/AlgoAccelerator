/**
 * Component Search Service (P2 2.A)
 *
 * Enhanced search and matching for the component library.
 * Provides:
 *   1. Full-text search with fuzzy matching
 *   2. Semantic similarity scoring
 *   3. Filter by category, status, complexity
 *   4. Search by value set codes
 *   5. Related component suggestions
 *
 * Uses a combination of exact matching, fuzzy string matching (Levenshtein),
 * and semantic scoring based on component metadata.
 */

             
                   
                  
                     
                    
                 
                  
                                   

// ============================================================================
// TYPES
// ============================================================================

                                
                                 
                
                             
                                   
                                    
                              
                                    
                                   
                                
                       
                                                         
                
                              
                      
                                    
                            
                                  
                 
                                      
                    
                      
                                                                  
                       
                                 
 

                               
                              
                              
                              
                
                                       
                         
 

                              
                           
                                                              
                         
               
                   
                                                  
                                             
                                            
 

                                         
                          
                              
                          
                                                                                        
                                    
                   
                    
                 
 

                              
                                        
                                            
                                              
                                      
                                        
                                     
                                          
                                      
                                                                  
                                                 
                               
                      
 

                            
             
               
                    
                       
                      
                           
                              
                              
                         
                              
                       
                        
                                                 
                 
                     
                    
 

// ============================================================================
// SEARCH INDEX
// ============================================================================

let searchIndex                     = null;

/**
 * Build or update the search index from a component library.
 */
export function buildSearchIndex(
  components                                  ,
  coOccurrenceData                                   
)              {
  const index              = {
    components: new Map(),
    termIndex: new Map(),
    oidIndex: new Map(),
    codeIndex: new Map(),
    coOccurrence: coOccurrenceData || new Map(),
    lastUpdated: Date.now(),
  };

  for (const component of Object.values(components)) {
    const indexed = indexComponent(component);
    index.components.set(component.id, indexed);

    // Add to term index
    for (const token of [...indexed.nameTokens, ...indexed.descriptionTokens, ...indexed.tags]) {
      const existing = index.termIndex.get(token) || new Set();
      existing.add(component.id);
      index.termIndex.set(token, existing);
    }

    // Add to OID index
    if (indexed.valueSetOid) {
      const existing = index.oidIndex.get(indexed.valueSetOid) || new Set();
      existing.add(component.id);
      index.oidIndex.set(indexed.valueSetOid, existing);
    }

    // Add to code index
    for (const { code, system } of indexed.codes) {
      const key = `${code}|${system}`;
      const existing = index.codeIndex.get(key) || new Set();
      existing.add(component.id);
      index.codeIndex.set(key, existing);

      // Also index just the code
      const codeOnly = index.codeIndex.get(code) || new Set();
      codeOnly.add(component.id);
      index.codeIndex.set(code, codeOnly);
    }
  }

  searchIndex = index;
  return index;
}

/**
 * Index a single component for searching.
 */
function indexComponent(component                  )                   {
  const indexed                   = {
    id: component.id,
    name: component.name,
    nameLower: component.name.toLowerCase(),
    nameTokens: tokenize(component.name),
    description: component.description || '',
    descriptionLower: (component.description || '').toLowerCase(),
    descriptionTokens: tokenize(component.description || ''),
    category: component.metadata.category,
    status: component.versionInfo.status,
    complexity: component.complexity.level,
    tags: component.metadata.tags.map(t => t.toLowerCase()),
    usageCount: component.usage.usageCount,
    updatedAt: component.metadata.updatedAt,
    codes: [],
  };

  if (component.type === 'atomic') {
    indexed.valueSetOid = component.valueSet.oid;
    indexed.valueSetName = component.valueSet.name;
    indexed.codes = (component.valueSet.codes || []).map(c => ({
      code: c.code,
      system: c.system,
    }));
  }

  return indexed;
}

/**
 * Tokenize text for indexing/searching.
 * Splits on whitespace and punctuation, lowercases, removes stop words.
 */
function tokenize(text        )           {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'that', 'this', 'these', 'those', 'it', 'its',
  ]);

  return text
    .toLowerCase()
    .split(/[\s\-_,;:()[\]{}'"]+/)
    .filter(t => t.length >= 2 && !stopWords.has(t));
}

// ============================================================================
// FUZZY MATCHING
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a        , b        )         {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix             = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-1) between query and text.
 * Higher score = better match.
 */
function fuzzyScore(query        , text        )         {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower === queryLower) return 1.0;

  // Prefix match
  if (textLower.startsWith(queryLower)) return 0.95;

  // Contains match
  if (textLower.includes(queryLower)) return 0.85;

  // Word boundary match
  const words = textLower.split(/\s+/);
  for (const word of words) {
    if (word === queryLower) return 0.9;
    if (word.startsWith(queryLower)) return 0.8;
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(queryLower, textLower);
  const maxLen = Math.max(queryLower.length, textLower.length);
  const similarity = 1 - (distance / maxLen);

  // Only return positive scores for reasonable matches
  return similarity > 0.4 ? similarity * 0.7 : 0;
}

/**
 * Calculate match score for a single token against indexed component.
 */
function tokenMatchScore(token        , indexed                  )                                            {
  const matches                = [];
  let bestScore = 0;

  // Name match (highest weight)
  const nameScore = fuzzyScore(token, indexed.name);
  if (nameScore > 0.3) {
    bestScore = Math.max(bestScore, nameScore * 1.2);
    matches.push({
      field: 'name',
      text: indexed.name,
      type: nameScore > 0.9 ? 'exact' : nameScore > 0.7 ? 'prefix' : 'fuzzy',
    });
  }

  // Value set name match
  if (indexed.valueSetName) {
    const vsScore = fuzzyScore(token, indexed.valueSetName);
    if (vsScore > 0.3) {
      bestScore = Math.max(bestScore, vsScore * 1.0);
      matches.push({
        field: 'valueSet',
        text: indexed.valueSetName,
        type: vsScore > 0.9 ? 'exact' : vsScore > 0.7 ? 'prefix' : 'fuzzy',
      });
    }
  }

  // Description match
  const descScore = fuzzyScore(token, indexed.description);
  if (descScore > 0.4) {
    bestScore = Math.max(bestScore, descScore * 0.8);
    matches.push({
      field: 'description',
      text: indexed.description.substring(0, 100),
      type: 'contains',
    });
  }

  // Tag match
  for (const tag of indexed.tags) {
    const tagScore = fuzzyScore(token, tag);
    if (tagScore > 0.5) {
      bestScore = Math.max(bestScore, tagScore * 0.9);
      matches.push({
        field: 'tag',
        text: tag,
        type: tagScore > 0.9 ? 'exact' : 'fuzzy',
      });
    }
  }

  // Code match (exact only)
  for (const { code } of indexed.codes) {
    if (code.toLowerCase() === token.toLowerCase()) {
      bestScore = Math.max(bestScore, 1.0);
      matches.push({
        field: 'code',
        text: code,
        type: 'exact',
      });
    }
  }

  return { score: bestScore, matches };
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search the component library.
 */
export function searchComponents(
  components                                  ,
  options               
)                 {
  // Ensure index is built
  if (!searchIndex || searchIndex.lastUpdated < Date.now() - 60000) {
    buildSearchIndex(components);
  }

  const index = searchIndex ;
  const queryTokens = tokenize(options.query || '');
  const results                 = [];

  // If searching by OID, use direct lookup
  if (options.valueSetOid) {
    const oidMatches = index.oidIndex.get(options.valueSetOid);
    if (oidMatches) {
      for (const id of oidMatches) {
        const component = components[id];
        if (component && matchesFilters(component, options)) {
          results.push({
            component,
            score: 1.0,
            matches: [{ field: 'valueSet', text: options.valueSetOid, type: 'exact' }],
          });
        }
      }
    }
  }

  // If searching by code, use code index
  if (options.code) {
    const codeKey = options.codeSystem
      ? `${options.code}|${options.codeSystem}`
      : options.code;
    const codeMatches = index.codeIndex.get(codeKey);
    if (codeMatches) {
      for (const id of codeMatches) {
        const component = components[id];
        if (component && matchesFilters(component, options)) {
          // Avoid duplicates
          if (!results.find(r => r.component.id === id)) {
            results.push({
              component,
              score: 0.95,
              matches: [{ field: 'code', text: options.code, type: 'exact' }],
            });
          }
        }
      }
    }
  }

  // Text search
  if (queryTokens.length > 0) {
    for (const [id, indexed] of index.components) {
      const component = components[id];
      if (!component || !matchesFilters(component, options)) continue;

      // Avoid duplicates from OID/code search
      if (results.find(r => r.component.id === id)) continue;

      // Calculate aggregate score across all query tokens
      let totalScore = 0;
      const allMatches                = [];

      for (const token of queryTokens) {
        const { score, matches } = tokenMatchScore(token, indexed);
        totalScore += score;
        allMatches.push(...matches);
      }

      // Average score across tokens
      const avgScore = totalScore / queryTokens.length;

      if (avgScore >= (options.minScore || 0.3)) {
        results.push({
          component,
          score: avgScore,
          matches: allMatches,
        });
      }
    }
  } else if (!options.valueSetOid && !options.code) {
    // No query, return all matching filters
    for (const component of Object.values(components)) {
      if (matchesFilters(component, options)) {
        results.push({
          component,
          score: 1.0,
          matches: [],
        });
      }
    }
  }

  // Sort results
  sortResults(results, options);

  // Apply limit
  if (options.limit && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Check if a component matches filter criteria.
 */
function matchesFilters(component                  , options               )          {
  // Category filter
  if (options.categories && options.categories.length > 0) {
    if (!options.categories.includes(component.metadata.category)) {
      return false;
    }
  }

  // Status filter
  if (options.statuses && options.statuses.length > 0) {
    if (!options.statuses.includes(component.versionInfo.status)) {
      return false;
    }
  }

  // Complexity filter
  if (options.complexities && options.complexities.length > 0) {
    if (!options.complexities.includes(component.complexity.level)) {
      return false;
    }
  }

  // Archived filter
  if (!options.includeArchived && component.versionInfo.status === 'archived') {
    return false;
  }

  return true;
}

/**
 * Sort search results by specified criteria.
 */
function sortResults(results                , options               )       {
  const sortBy = options.sortBy || 'relevance';
  const direction = options.sortDirection || 'desc';
  const multiplier = direction === 'desc' ? -1 : 1;

  results.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        comparison = a.score - b.score;
        break;
      case 'name':
        comparison = a.component.name.localeCompare(b.component.name);
        break;
      case 'usage':
        comparison = a.component.usage.usageCount - b.component.usage.usageCount;
        break;
      case 'date':
        comparison = new Date(a.component.metadata.updatedAt).getTime() -
                     new Date(b.component.metadata.updatedAt).getTime();
        break;
      case 'complexity':
        const complexityOrder = { low: 1, medium: 2, high: 3 };
        comparison = complexityOrder[a.component.complexity.level] -
                     complexityOrder[b.component.complexity.level];
        break;
    }

    return comparison * multiplier;
  });
}

// ============================================================================
// RELATED COMPONENTS
// ============================================================================

/**
 * Find components related to a given component.
 */
export function findRelatedComponents(
  component                  ,
  components                                  ,
  limit         = 10
)                           {
  const results                           = [];

  // Ensure index is built
  if (!searchIndex) {
    buildSearchIndex(components);
  }
  const index = searchIndex ;

  // Same value set (different timing/negation)
  if (component.type === 'atomic') {
    const oid = component.valueSet.oid;
    const sameOid = index.oidIndex.get(oid);
    if (sameOid) {
      for (const id of sameOid) {
        if (id === component.id) continue;
        const related = components[id];
        if (related && related.type === 'atomic') {
          results.push({
            component: related,
            relationship: 'same_value_set',
            strength: 0.9,
            reason: `Uses same value set: ${component.valueSet.name}`,
          });
        }
      }
    }
  }

  // Same category
  for (const other of Object.values(components)) {
    if (other.id === component.id) continue;
    if (results.find(r => r.component.id === other.id)) continue;

    if (other.metadata.category === component.metadata.category) {
      results.push({
        component: other,
        relationship: 'same_category',
        strength: 0.5,
        reason: `Same category: ${component.metadata.category}`,
      });
    }
  }

  // Co-occurrence (used together in measures)
  const coOccur = index.coOccurrence.get(component.id);
  if (coOccur) {
    for (const [otherId, count] of coOccur) {
      if (results.find(r => r.component.id === otherId)) continue;
      const other = components[otherId];
      if (other) {
        results.push({
          component: other,
          relationship: 'used_together',
          strength: Math.min(count / 10, 1.0),
          reason: `Used together in ${count} measure(s)`,
        });
      }
    }
  }

  // Similar timing (for atomics)
  if (component.type === 'atomic') {
    for (const other of Object.values(components)) {
      if (other.id === component.id) continue;
      if (other.type !== 'atomic') continue;
      if (results.find(r => r.component.id === other.id)) continue;

      const a = component                   ;
      const b = other                   ;

      if (a.timing.operator === b.timing.operator &&
          a.timing.reference === b.timing.reference &&
          a.timing.quantity === b.timing.quantity &&
          a.timing.unit === b.timing.unit) {
        results.push({
          component: other,
          relationship: 'similar_timing',
          strength: 0.4,
          reason: `Same timing: ${a.timing.displayExpression}`,
        });
      }
    }
  }

  // Sort by strength and limit
  results.sort((a, b) => b.strength - a.strength);
  return results.slice(0, limit);
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

/**
 * Get autocomplete suggestions for a partial query.
 */
export function getSearchSuggestions(
  query        ,
  components                                  ,
  limit         = 8
)           {
  if (!query || query.length < 2) return [];

  // Ensure index is built
  if (!searchIndex) {
    buildSearchIndex(components);
  }
  const index = searchIndex ;

  const suggestions = new Set        ();
  const queryLower = query.toLowerCase();

  // Suggest from component names
  for (const [, indexed] of index.components) {
    if (indexed.nameLower.includes(queryLower)) {
      suggestions.add(indexed.name);
    }
    if (indexed.valueSetName?.toLowerCase().includes(queryLower)) {
      suggestions.add(indexed.valueSetName);
    }
  }

  // Suggest from terms
  for (const term of index.termIndex.keys()) {
    if (term.startsWith(queryLower)) {
      suggestions.add(term);
    }
  }

  return Array.from(suggestions).slice(0, limit);
}

/**
 * Update co-occurrence data when a measure is saved.
 * Call this when components are used together in a measure.
 */
export function updateCoOccurrence(
  componentIds          ,
  components                                  
)       {
  if (!searchIndex) {
    buildSearchIndex(components);
  }

  // Update co-occurrence counts for all pairs
  for (let i = 0; i < componentIds.length; i++) {
    for (let j = i + 1; j < componentIds.length; j++) {
      const idA = componentIds[i];
      const idB = componentIds[j];

      // A -> B
      const mapA = searchIndex .coOccurrence.get(idA) || new Map                ();
      mapA.set(idB, (mapA.get(idB) || 0) + 1);
      searchIndex .coOccurrence.set(idA, mapA);

      // B -> A
      const mapB = searchIndex .coOccurrence.get(idB) || new Map                ();
      mapB.set(idA, (mapB.get(idA) || 0) + 1);
      searchIndex .coOccurrence.set(idB, mapB);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  searchComponents,
  buildSearchIndex,
  findRelatedComponents,
  getSearchSuggestions,
  updateCoOccurrence,
};
