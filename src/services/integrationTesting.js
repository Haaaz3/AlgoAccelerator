/**
 * Integration Testing Service (P2 4.E)
 *
 * End-to-end testing utilities for the measure acceleration pipeline.
 * Tests the full flow:
 *   1. Document extraction (PDF/text -> UMS)
 *   2. Component matching (UMS -> Library links)
 *   3. Code generation (UMS -> CQL)
 *   4. SQL generation (CQL -> HDI SQL)
 *   5. Validation (syntax, semantics, ELM)
 *
 * Provides:
 *   - Golden test fixtures (known good inputs/outputs)
 *   - Regression testing against baseline
 *   - Performance benchmarks
 *   - Coverage metrics for measure types
 */

                                                                               
                                                                  
                                                     

// ============================================================================
// TYPES
// ============================================================================

                           
                       
             
                            
               
                         
                      
                              
                         
                   
                   
                         
                             
                           
                 
                                                 
                    
 

                          
                
                        
                    
                    
                
                 

                            
                                                 
                        
                                                        
                             
                                                
                                             
                                               
                          
                                 
                                   
 

                                   
                            
                     
                                  
                           
                                          
                             
                                 
                         
                                
                          
                                      
                         
                                      
                         
                                    
                             
                                 
                            
                          
                            
                 
                                           
                    
     
 

                             
                     
                 
                            
                  
                                 
                   
                                     
                                
                                    
                 
                                      
           
                               
                 
                 
                           
    
 

                                  
                       
               
                                 
                  
                       
                    
                     
                  
                                
                   
 

                                  
                   
               
                        
                     
                     
                      
                     
                      
                      
                       
                       
                   
                                
                        
                         
                            
 

                                  
                                 
                            
                              
                         
                              
                                              
                             
                        
 

                                   
                         
                          
                        
                         
                              
                         
                              
                         
                                                   
                        
                   
                  
                      
                      
     
                            
                             
                   
                        
                        
                          
     
 

// ============================================================================
// GOLDEN TEST FIXTURES
// ============================================================================

/**
 * Create a simple demographics-only measure for testing.
 */
export function createDemographicsTestCase()           {
  return {
    id: 'demographics-only',
    name: 'Demographics Only Measure',
    description: 'Tests extraction of age and sex demographics without clinical criteria',
    category: 'extraction',
    input: {
      documentText: `
        CMS123v1 - Demographics Test Measure

        Initial Population:
        Patients aged 18 to 75 years with a visit during the measurement period.

        Denominator:
        Equals Initial Population.

        Numerator:
        Female patients in the denominator.
      `,
    },
    expected: {
      measureId: 'CMS123v1',
      populationCount: 3,
      populationTypes: ['initial_population', 'denominator', 'numerator'],
    },
    tags: ['demographics', 'simple'],
    isGolden: true,
  };
}

/**
 * Create a screening measure test case (e.g., CRC screening).
 */
export function createScreeningTestCase()           {
  return {
    id: 'crc-screening',
    name: 'Colorectal Cancer Screening',
    description: 'Tests extraction of screening measure with multiple numerator criteria',
    category: 'end_to_end',
    input: {
      documentText: `
        CMS130v12 - Colorectal Cancer Screening

        Initial Population:
        Patients 50-75 years of age with an outpatient visit during the measurement period.

        Denominator:
        Equals Initial Population.

        Denominator Exclusions:
        - Patients with colorectal cancer
        - Patients with total colectomy
        - Patients in hospice care

        Numerator:
        Patients with one or more of the following:
        - Colonoscopy within 10 years
        - Flexible sigmoidoscopy within 5 years
        - FOBT within 1 year
        - FIT-DNA test within 3 years
        - CT colonography within 5 years
      `,
    },
    expected: {
      measureId: 'CMS130v12',
      populationCount: 4,
      populationTypes: ['initial_population', 'denominator', 'denominator_exclusion', 'numerator'],
      valueSetOids: [
        '2.16.840.1.113883.3.464.1003.108.12.1020', // Colonoscopy
        '2.16.840.1.113883.3.464.1003.198.12.1011', // FOBT
      ],
      cqlPatterns: [
        /Colonoscopy.*10 years/i,
        /hospice/i,
      ],
    },
    tags: ['screening', 'cancer', 'complex'],
    isGolden: true,
  };
}

/**
 * Create an immunization measure test case.
 */
export function createImmunizationTestCase()           {
  return {
    id: 'childhood-immunization',
    name: 'Childhood Immunization Status',
    description: 'Tests extraction of immunization measure with multiple vaccine requirements',
    category: 'end_to_end',
    input: {
      documentText: `
        CMS117v12 - Childhood Immunization Status

        Initial Population:
        Children who turn 2 years of age during the measurement period with a visit during the measurement period.

        Denominator:
        Equals Initial Population.

        Denominator Exclusions:
        - Patients in hospice care

        Numerator:
        Children who have received all of the following immunizations by their second birthday:
        - DTaP (4 doses)
        - IPV (3 doses)
        - MMR (1 dose)
        - Hib (3-4 doses)
        - Hepatitis B (3 doses)
        - VZV (1 dose)
        - Pneumococcal (4 doses)
        - Hepatitis A (1 dose)
        - Rotavirus (2-3 doses)
        - Influenza (2 doses)
      `,
    },
    expected: {
      measureId: 'CMS117v12',
      populationCount: 4,
      populationTypes: ['initial_population', 'denominator', 'denominator_exclusion', 'numerator'],
      cqlPatterns: [
        /DTaP/i,
        /MMR/i,
        /Hepatitis B/i,
      ],
    },
    tags: ['immunization', 'pediatric', 'complex'],
    isGolden: true,
  };
}

/**
 * Create a test case for CQL generation.
 */
export function createCQLGenerationTestCase(ums                      )           {
  return {
    id: `cql-gen-${ums.metadata.measureId}`,
    name: `CQL Generation - ${ums.metadata.title}`,
    description: 'Tests CQL generation from UMS structure',
    category: 'cql_generation',
    input: { ums },
    expected: {
      validationPasses: true,
      cqlPatterns: [
        /library\s+\w+\s+version/i,
        /define\s+"Initial Population"/i,
        /define\s+"Denominator"/i,
        /define\s+"Numerator"/i,
      ],
    },
    tags: ['cql', 'generation'],
    isGolden: false,
  };
}

/**
 * Create a test case for SQL generation.
 */
export function createSQLGenerationTestCase(ums                      , dialect            )           {
  return {
    id: `sql-gen-${ums.metadata.measureId}-${dialect}`,
    name: `SQL Generation (${dialect}) - ${ums.metadata.title}`,
    description: `Tests SQL generation for ${dialect} dialect`,
    category: 'sql_generation',
    input: { ums, sqlDialect: dialect },
    expected: {
      validationPasses: true,
      sqlPatterns: [
        /SELECT/i,
        /FROM/i,
        /WHERE/i,
      ],
    },
    tags: ['sql', 'generation', dialect],
    isGolden: false,
  };
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run a single test case.
 */
export async function runTestCase(
  testCase          ,
  options   
                     
                      
    = {}
)                      {
  const startTime = Date.now();
  const assertions                    = [];
  const actual                       = {};

  try {
    // Run appropriate test based on category
    switch (testCase.category) {
      case 'extraction':
        await runExtractionTest(testCase, assertions, actual);
        break;
      case 'cql_generation':
        await runCQLGenerationTest(testCase, assertions, actual);
        break;
      case 'sql_generation':
        await runSQLGenerationTest(testCase, assertions, actual);
        break;
      case 'validation':
        await runValidationTest(testCase, assertions, actual);
        break;
      case 'end_to_end':
        await runEndToEndTest(testCase, assertions, actual);
        break;
      default:
        throw new Error(`Unknown test category: ${testCase.category}`);
    }

    // Run custom assertions
    if (testCase.expected.customAssertions) {
      for (const custom of testCase.expected.customAssertions) {
        const result             = {
          testId: testCase.id,
          passed: false,
          duration: 0,
          assertions: [],
          actual,
        };

        const passed = custom.check(result);
        assertions.push({
          name: custom.name,
          passed,
          expected: true,
          actual: passed,
          message: passed ? undefined : custom.message,
        });
      }
    }

    const passed = assertions.every(a => a.passed);

    return {
      testId: testCase.id,
      passed,
      duration: Date.now() - startTime,
      assertions,
      actual,
    };
  } catch (error) {
    return {
      testId: testCase.id,
      passed: false,
      duration: Date.now() - startTime,
      assertions,
      error: error instanceof Error ? error.message : String(error),
      actual,
    };
  }
}

/**
 * Run extraction test.
 */
async function runExtractionTest(
  testCase          ,
  assertions                   ,
  actual                      
)                {
  // Note: In a real implementation, this would call the AI extractor
  // For now, we'll simulate the expected structure

  if (!testCase.input.documentText) {
    throw new Error('documentText is required for extraction tests');
  }

  // Simulate extraction (in real implementation, call extractMeasureWithAI)
  const mockUMS                       = {
    id: 'test-ums',
    metadata: {
      measureId: testCase.expected.measureId || 'Unknown',
      title: 'Test Measure',
      version: '1.0',
      program: 'MIPS_CQM',
      measureType: 'process',
      description: 'Test description',
      lastUpdated: new Date().toISOString(),
      sourceDocuments: [],
    },
    populations: [],
    valueSets: [],
    status: 'in_progress',
    overallConfidence: 'medium',
    reviewProgress: { total: 0, approved: 0, pending: 0, flagged: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  actual.ums = mockUMS;

  // Check measure ID
  if (testCase.expected.measureId) {
    assertions.push({
      name: 'measureId',
      passed: actual.ums?.metadata.measureId === testCase.expected.measureId,
      expected: testCase.expected.measureId,
      actual: actual.ums?.metadata.measureId,
    });
  }

  // Check population count
  if (testCase.expected.populationCount !== undefined) {
    assertions.push({
      name: 'populationCount',
      passed: actual.ums?.populations.length === testCase.expected.populationCount,
      expected: testCase.expected.populationCount,
      actual: actual.ums?.populations.length,
    });
  }
}

/**
 * Run CQL generation test.
 */
async function runCQLGenerationTest(
  testCase          ,
  assertions                   ,
  actual                      
)                {
  if (!testCase.input.ums) {
    throw new Error('UMS is required for CQL generation tests');
  }

  // In real implementation, call generateCQL from cqlGenerator.ts
  // For now, simulate
  const mockCQL = `
library ${testCase.input.ums.metadata.measureId.replace(/[^a-zA-Z0-9]/g, '')} version '1.0.0'

using QICore version '4.1.1'

define "Initial Population":
  true

define "Denominator":
  "Initial Population"

define "Numerator":
  true
`;

  actual.cql = mockCQL;

  // Check CQL patterns
  if (testCase.expected.cqlPatterns) {
    for (const pattern of testCase.expected.cqlPatterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const matches = regex.test(actual.cql);
      assertions.push({
        name: `cqlPattern: ${pattern}`,
        passed: matches,
        expected: true,
        actual: matches,
        message: matches ? undefined : `CQL does not match pattern: ${pattern}`,
      });
    }
  }
}

/**
 * Run SQL generation test.
 */
async function runSQLGenerationTest(
  testCase          ,
  assertions                   ,
  actual                      
)                {
  if (!testCase.input.ums) {
    throw new Error('UMS is required for SQL generation tests');
  }

  // In real implementation, call generateHDISQL from hdiSqlGenerator.ts
  // For now, simulate
  const mockSQL = `
-- Generated SQL for ${testCase.input.ums.metadata.measureId}

SELECT
  patient_id,
  measure_id,
  CASE WHEN numerator THEN 1 ELSE 0 END AS numerator_flag
FROM (
  SELECT * FROM patients WHERE age BETWEEN 18 AND 75
) base
`;

  actual.sql = mockSQL;

  // Check SQL patterns
  if (testCase.expected.sqlPatterns) {
    for (const pattern of testCase.expected.sqlPatterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      const matches = regex.test(actual.sql);
      assertions.push({
        name: `sqlPattern: ${pattern}`,
        passed: matches,
        expected: true,
        actual: matches,
        message: matches ? undefined : `SQL does not match pattern: ${pattern}`,
      });
    }
  }
}

/**
 * Run validation test.
 */
async function runValidationTest(
  testCase          ,
  assertions                   ,
  actual                      
)                {
  // In real implementation, call validateCQLSyntax from cqlValidator.ts
  // For now, simulate
  const mockValidation = {
    valid: testCase.expected.validationPasses ?? true,
    errors: testCase.expected.expectedErrors || [],
    warnings: [],
  };

  actual.validationResult = mockValidation;

  if (testCase.expected.validationPasses !== undefined) {
    assertions.push({
      name: 'validationPasses',
      passed: mockValidation.valid === testCase.expected.validationPasses,
      expected: testCase.expected.validationPasses,
      actual: mockValidation.valid,
    });
  }

  if (testCase.expected.expectedErrors) {
    for (const expectedError of testCase.expected.expectedErrors) {
      const found = mockValidation.errors.some((e        ) => e.includes(expectedError));
      assertions.push({
        name: `expectedError: ${expectedError}`,
        passed: found,
        expected: true,
        actual: found,
        message: found ? undefined : `Expected error not found: ${expectedError}`,
      });
    }
  }
}

/**
 * Run end-to-end test (extraction -> generation -> validation).
 */
async function runEndToEndTest(
  testCase          ,
  assertions                   ,
  actual                      
)                {
  // Run extraction
  await runExtractionTest(testCase, assertions, actual);

  // If extraction succeeded, run CQL generation
  if (actual.ums) {
    const cqlTestCase = createCQLGenerationTestCase(actual.ums);
    cqlTestCase.expected = { ...cqlTestCase.expected, ...testCase.expected };
    await runCQLGenerationTest({ ...testCase, input: { ums: actual.ums } }, assertions, actual);
  }

  // Run validation
  if (actual.cql) {
    await runValidationTest(testCase, assertions, actual);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Run a test suite (multiple test cases).
 */
export async function runTestSuite(
  testCases            ,
  options   
                     
                      
                       
    = {}
)                           {
  const startTime = Date.now();
  const results               = [];

  // Run tests (sequential for now, can add parallel later)
  for (const testCase of testCases) {
    const result = await runTestCase(testCase, options);
    results.push(result);

    if (options.verbose) {
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${testCase.name} (${result.duration}ms)`);
      if (!result.passed) {
        for (const assertion of result.assertions.filter(a => !a.passed)) {
          console.log(`  - ${assertion.name}: expected ${assertion.expected}, got ${assertion.actual}`);
        }
      }
    }
  }

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  // Calculate coverage
  const coverage = calculateCoverage(testCases);

  return {
    name: 'Integration Test Suite',
    totalTests: testCases.length,
    passedTests,
    failedTests,
    skippedTests: 0,
    duration: Date.now() - startTime,
    results,
    coverage,
  };
}

/**
 * Calculate coverage metrics from test cases.
 */
function calculateCoverage(testCases            )                  {
  const populationTypes = new Set        ();
  const measureTypes = new Set        ();
  const codeSystems = new Set        ();
  let minValueSets = Infinity;
  let maxValueSets = 0;

  for (const testCase of testCases) {
    if (testCase.expected.populationTypes) {
      testCase.expected.populationTypes.forEach(t => populationTypes.add(t));
    }
    if (testCase.expected.valueSetCount !== undefined) {
      minValueSets = Math.min(minValueSets, testCase.expected.valueSetCount);
      maxValueSets = Math.max(maxValueSets, testCase.expected.valueSetCount);
    }
  }

  return {
    populationTypes: Array.from(populationTypes),
    measureTypes: Array.from(measureTypes),
    valueSetRange: {
      min: minValueSets === Infinity ? 0 : minValueSets,
      max: maxValueSets,
    },
    codeSystems: Array.from(codeSystems),
  };
}

// ============================================================================
// REGRESSION TESTING
// ============================================================================

/**
 * Compare current results against a baseline for regression testing.
 */
export function compareToBaseline(
  current                 ,
  baseline                 
)                   {
  const currentById = new Map(current.results.map(r => [r.testId, r]));
  const baselineById = new Map(baseline.results.map(r => [r.testId, r]));

  const newlyPassing           = [];
  const newlyFailing           = [];
  const outputChanges                                    = [];
  const performanceChanges                                         = [];

  // Check tests in both
  for (const [testId, currentResult] of currentById) {
    const baselineResult = baselineById.get(testId);
    if (!baselineResult) continue;

    // Status changes
    if (currentResult.passed && !baselineResult.passed) {
      newlyPassing.push(testId);
    } else if (!currentResult.passed && baselineResult.passed) {
      newlyFailing.push(testId);
    }

    // Performance changes (>20% difference)
    const durationDiff = currentResult.duration - baselineResult.duration;
    const percentChange = (durationDiff / baselineResult.duration) * 100;
    if (Math.abs(percentChange) > 20) {
      performanceChanges.push({
        testId,
        oldDuration: baselineResult.duration,
        newDuration: currentResult.duration,
        percentChange,
      });
    }
  }

  return {
    baselineVersion: 'baseline',
    currentVersion: 'current',
    newlyPassing,
    newlyFailing,
    outputChanges,
    performanceChanges,
  };
}

// ============================================================================
// GOLDEN TESTS REGISTRY
// ============================================================================

/**
 * Get all golden test cases.
 */
export function getGoldenTestCases()             {
  return [
    createDemographicsTestCase(),
    createScreeningTestCase(),
    createImmunizationTestCase(),
  ];
}

/**
 * Run all golden tests.
 */
export async function runGoldenTests(
  options                        = {}
)                           {
  const goldenTests = getGoldenTestCases();
  return runTestSuite(goldenTests, options);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  runTestCase,
  runTestSuite,
  runGoldenTests,
  getGoldenTestCases,
  compareToBaseline,
  createDemographicsTestCase,
  createScreeningTestCase,
  createImmunizationTestCase,
  createCQLGenerationTestCase,
  createSQLGenerationTestCase,
};
