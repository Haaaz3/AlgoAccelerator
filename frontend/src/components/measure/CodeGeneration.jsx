import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Code, Copy, Check, Download, RefreshCw, FileCode, Database, Sparkles,
  Library, ChevronRight, CheckCircle, XCircle, AlertTriangle, Loader2,
  Search, X, ChevronUp, ChevronDown, Edit3
} from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore.js';
import { InlineErrorBanner } from '../shared/ErrorBoundary.jsx';

// Code format info for display
const CODE_FORMAT_INFO = {
  cql: { label: 'CQL', icon: FileCode, color: 'text-purple-400' },
  synapse: { label: 'Synapse SQL', icon: Database, color: 'text-[var(--accent)]' },
};

export function CodeGeneration() {
  const { selectedCodeFormat, setSelectedCodeFormat, setActiveTab } = useMeasureStore();
  // Use Zustand selector for reactive updates when measure is edited
  const measure = useMeasureStore((state) =>
    state.measures.find((m) => m.id === state.activeMeasureId) || null
  );
  const format = selectedCodeFormat;
  const setFormat = setSelectedCodeFormat;

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const codeRef = useRef(null);
  const searchInputRef = useRef(null);
  const currentMatchRef = useRef(null);

  // Helper to extract embedded WARNING comments from generated code
  const extractEmbeddedWarnings = useCallback((code) => {
    const warnings = [];
    const warningPattern = /\/\*\s*WARNING:\s*([^*]+)\*\//g;
    const commentPattern = /--\s*WARNING:\s*(.+)$/gm;

    let match;
    while ((match = warningPattern.exec(code)) !== null) {
      warnings.push(match[1].trim());
    }
    while ((match = commentPattern.exec(code)) !== null) {
      warnings.push(match[1].trim());
    }

    return warnings;
  }, []);

  // Search functionality
  const performSearch = useCallback((query, code) => {
    if (!query.trim() || !code) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = [];
    const lowerQuery = query.toLowerCase();
    const lowerCode = code.toLowerCase();
    let pos = 0;

    while ((pos = lowerCode.indexOf(lowerQuery, pos)) !== -1) {
      results.push(pos);
      pos += 1;
    }

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, []);

  const navigateSearch = useCallback((direction) => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);
  }, [currentSearchIndex, searchResults.length]);

  const toggleSearch = useCallback(() => {
    setSearchVisible(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        setSearchQuery('');
        setSearchResults([]);
      }
      return !prev;
    });
  }, []);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (!searchVisible) {
          toggleSearch();
        } else {
          searchInputRef.current?.focus();
        }
      }
      // Escape to close search
      if (e.key === 'Escape' && searchVisible) {
        toggleSearch();
      }
      // Enter/Shift+Enter to navigate results
      if (e.key === 'Enter' && searchVisible && searchResults.length > 0) {
        e.preventDefault();
        navigateSearch(e.shiftKey ? 'prev' : 'next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchVisible, searchResults.length, navigateSearch, toggleSearch]);

  // Update search results when query or code changes
  useEffect(() => {
    performSearch(searchQuery, generatedCode);
  }, [searchQuery, generatedCode, performSearch]);

  // Scroll to current match when it changes
  useEffect(() => {
    if (currentMatchRef.current && searchResults.length > 0) {
      currentMatchRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSearchIndex, searchResults.length]);

  // Helper to highlight search matches in code
  const highlightCode = useCallback((code) => {
    if (!searchQuery.trim() || searchResults.length === 0) {
      return code;
    }

    const parts = [];
    let lastIndex = 0;

    searchResults.forEach((pos, idx) => {
      // Add text before match
      if (pos > lastIndex) {
        parts.push(code.substring(lastIndex, pos));
      }

      // Add highlighted match
      const matchText = code.substring(pos, pos + searchQuery.length);
      const isCurrentMatch = idx === currentSearchIndex;
      parts.push(
        <mark
          key={`match-${idx}`}
          ref={isCurrentMatch ? currentMatchRef : undefined}
          className={`${isCurrentMatch ? 'bg-[var(--accent)] text-white' : 'bg-[var(--warning)]/40'} rounded px-0.5`}
        >
          {matchText}
        </mark>
      );

      lastIndex = pos + searchQuery.length;
    });

    // Add remaining text
    if (lastIndex < code.length) {
      parts.push(code.substring(lastIndex));
    }

    return <>{parts}</>;
  }, [searchQuery, searchResults, currentSearchIndex]);

  // Generate code when measure or format changes
  useEffect(() => {
    if (!measure) {
      setGeneratedCode('');
      return;
    }

    try {
      setGenerationError(null);
      const code = getGeneratedCode(measure, format);
      setGeneratedCode(code);
      setValidationResult(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during code generation';
      setGenerationError(`Code generation failed: ${errorMessage}`);
      setGeneratedCode('');
    }
  }, [measure, format]);

  if (!measure) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
            <Code className="w-8 h-8 text-[var(--text-dim)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No Measure Selected</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Select a measure from the library to generate CQL or SQL code.
          </p>
          <button
            onClick={() => setActiveTab('library')}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors inline-flex items-center gap-2"
          >
            <Library className="w-4 h-4" />
            Go to Measure Library
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension = format === 'cql' ? 'cql' : 'sql';
    const filename = `${measure.metadata.measureId || 'measure'}_${format}.${extension}`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const code = getGeneratedCode(measure, format);
      setGeneratedCode(code);
      setValidationResult(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during code generation';
      setGenerationError(`Code generation failed: ${errorMessage}`);
    }

    setTimeout(() => setIsGenerating(false), 500);
  };

  const handleValidate = async () => {
    if (!generatedCode) return;

    setIsValidating(true);
    try {
      // Simulated validation - in a real app, this would call a validation service
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check for basic syntax issues
      const issues = [];
      if (format === 'cql') {
        if (!generatedCode.includes('library')) {
          issues.push({ severity: 'error', message: 'Missing library declaration' });
        }
        if (!generatedCode.includes('define')) {
          issues.push({ severity: 'warning', message: 'No definitions found' });
        }
      } else if (format === 'synapse') {
        if (!generatedCode.includes('SELECT') && !generatedCode.includes('select')) {
          issues.push({ severity: 'warning', message: 'No SELECT statements found' });
        }
      }

      setValidationResult({
        valid: issues.filter(i => i.severity === 'error').length === 0,
        errors: issues.filter(i => i.severity === 'error'),
        warnings: issues.filter(i => i.severity === 'warning'),
      });
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [{ severity: 'error', message: err instanceof Error ? err.message : 'Validation failed' }],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const reviewProgress = measure.reviewProgress || { approved: 0, total: 1 };
  const canGenerate = reviewProgress.approved === reviewProgress.total;
  const approvalPercent = Math.round((reviewProgress.approved / reviewProgress.total) * 100);

  // Extract warnings from generated code
  const embeddedWarnings = extractEmbeddedWarnings(generatedCode);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-4">
          <button
            onClick={() => setActiveTab('library')}
            className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Measure Library
          </button>
          <ChevronRight className="w-4 h-4 text-[var(--text-dim)]" />
          <span className="text-[var(--text-muted)]">{measure.metadata.measureId}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-dim)]" />
          <span className="text-[var(--text)]">Code Generation</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--text)]">Code Generation</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Generate executable code from the approved Universal Measure Spec
          </p>
        </div>

        {/* Approval status */}
        {!canGenerate && (
          <div className="mb-6 p-4 bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-[var(--warning)]">Review Required</h3>
                <p className="text-sm text-[var(--warning)] opacity-80 mt-1">
                  All measure components must be approved before generating production code.
                  Currently {approvalPercent}% approved ({reviewProgress.approved}/{reviewProgress.total} components).
                </p>
                <button
                  onClick={() => useMeasureStore.getState().setActiveTab('editor')}
                  className="mt-3 px-3 py-1.5 bg-[var(--warning-light)] text-[var(--warning)] rounded-lg text-sm font-medium hover:opacity-80 transition-all border border-[var(--warning)]/20"
                >
                  Continue Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Format selector */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-[var(--text-muted)]">Output Format:</span>
          <div className="flex gap-2">
            {[
              { id: 'cql', label: 'CQL', icon: FileCode },
              { id: 'synapse', label: 'Synapse SQL', icon: Database },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  format === f.id
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/30'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code preview */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text)]">
                {measure.metadata.measureId}_{format.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSearch}
                className={`px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                  searchVisible
                    ? 'text-[var(--accent)] bg-[var(--accent-light)] rounded-lg'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                title="Search (Ctrl+F)"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
              <button
                onClick={handleValidate}
                disabled={isValidating || !generatedCode}
                className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text)] rounded-lg flex items-center gap-2 hover:bg-[var(--bg)] transition-colors disabled:opacity-50"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : validationResult?.valid ? (
                  <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                ) : validationResult ? (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isValidating ? 'Validating...' : validationResult?.valid ? 'Valid' : 'Validate'}
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text)] rounded-lg flex items-center gap-2 hover:bg-[var(--bg)] transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm bg-[var(--accent-light)] text-[var(--accent)] rounded-lg flex items-center gap-2 hover:bg-[var(--accent)]/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchVisible && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    navigateSearch(e.shiftKey ? 'prev' : 'next');
                  }
                }}
                placeholder="Search in code... (Enter for next, Shift+Enter for prev)"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none"
              />
              {searchResults.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {currentSearchIndex + 1} of {searchResults.length}
                </span>
              )}
              {searchQuery && searchResults.length === 0 && (
                <span className="text-xs text-[var(--warning)]">No matches</span>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateSearch('prev')}
                  disabled={searchResults.length === 0}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
                  title="Previous (Shift+Enter)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  disabled={searchResults.length === 0}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
                  title="Next (Enter)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={toggleSearch}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                title="Close (Escape)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Code content */}
          <div className="relative">
            {isGenerating && (
              <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-3 text-[var(--accent)]">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generating {format.toUpperCase()}...</span>
                </div>
              </div>
            )}
            <pre ref={codeRef} className="p-4 text-sm font-mono overflow-auto max-h-[600px] text-[var(--text)]">
              <code className={!canGenerate ? 'opacity-50' : ''}>
                {searchQuery && searchResults.length > 0 ? highlightCode(generatedCode) : generatedCode || '// Click "Regenerate" to create code'}
              </code>
            </pre>
          </div>
        </div>

        {/* Generation Error Display */}
        {generationError && (
          <div className="mt-4">
            <InlineErrorBanner
              message={generationError}
              onDismiss={() => setGenerationError(null)}
            />
          </div>
        )}

        {/* Embedded Warnings */}
        {embeddedWarnings.length > 0 && (
          <div className="mt-4 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
              <h3 className="text-sm font-medium text-[var(--warning)]">
                Generation Warnings ({embeddedWarnings.length})
              </h3>
            </div>
            <div className="space-y-1">
              {embeddedWarnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--warning)]">
                  <span className="text-[var(--warning)] mt-0.5">•</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className={`mt-6 p-4 rounded-xl border ${
            validationResult.valid
              ? 'bg-[var(--success)]/5 border-[var(--success)]/30'
              : 'bg-[var(--danger)]/5 border-[var(--danger)]/30'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {validationResult.valid ? (
                <>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                  <h3 className="text-sm font-medium text-[var(--success)]">Validation Passed</h3>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-[var(--danger)]" />
                  <h3 className="text-sm font-medium text-[var(--danger)]">Validation Failed</h3>
                </>
              )}
            </div>

            {validationResult.errors?.length > 0 && (
              <div className="space-y-2 mb-3">
                <h4 className="text-xs font-medium text-[var(--danger)] uppercase tracking-wider">Errors ({validationResult.errors.length})</h4>
                {validationResult.errors.map((error, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--danger)]">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error.message}</span>
                  </div>
                ))}
              </div>
            )}

            {validationResult.warnings?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[var(--warning)] uppercase tracking-wider">Warnings ({validationResult.warnings.length})</h4>
                {validationResult.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--warning)]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generation notes */}
        <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
          <h3 className="text-sm font-medium text-[var(--text)] mb-2">Generation Notes</h3>
          <ul className="space-y-1 text-sm text-[var(--text-muted)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-0.5">•</span>
              Code generated from UMS version {measure.metadata.version || '1.0'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-0.5">•</span>
              {measure.populations?.length || 0} population definitions included
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-0.5">•</span>
              {measure.valueSets?.length || 0} value set references linked
            </li>
            {!canGenerate && (
              <li className="flex items-start gap-2 text-[var(--warning)]">
                <span className="mt-0.5">⚠</span>
                Preview only - complete review to generate production code
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Helper to extract age range from population data elements
function extractAgeRange(populations) {
  if (!populations) return null;

  const findAgeConstraints = (node) => {
    if (!node) return null;

    // Check thresholds
    if (node.thresholds) {
      const t = node.thresholds;
      if (t.ageMin !== undefined || t.ageMax !== undefined) {
        return { min: t.ageMin, max: t.ageMax };
      }
    }

    // Check constraints field
    if (node.constraints) {
      const c = node.constraints;
      if (c.ageMin !== undefined || c.ageMax !== undefined) {
        return { min: c.ageMin, max: c.ageMax };
      }
      if (c.minAge !== undefined || c.maxAge !== undefined) {
        return { min: c.minAge, max: c.maxAge };
      }
    }

    // Recursively check children
    if (node.children) {
      for (const child of node.children) {
        const result = findAgeConstraints(child);
        if (result) return result;
      }
    }

    // Check nested criteria
    if (node.criteria) {
      return findAgeConstraints(node.criteria);
    }

    return null;
  };

  // Search through populations for age constraints
  for (const pop of populations) {
    const constraints = findAgeConstraints(pop);
    if (constraints && (constraints.min !== undefined || constraints.max !== undefined)) {
      return {
        min: constraints.min ?? 0,
        max: constraints.max ?? 999
      };
    }
  }

  return null;
}

// Helper to collect all data elements from populations
function collectDataElements(populations) {
  if (!populations) return [];
  const elements = [];

  const traverse = (node) => {
    if (!node) return;
    if (node.type && ['diagnosis', 'encounter', 'procedure', 'observation', 'medication', 'demographic', 'assessment'].includes(node.type)) {
      elements.push(node);
    }
    if (node.criteria) traverse(node.criteria);
    if (node.children) node.children.forEach(traverse);
  };

  populations.forEach(traverse);
  return elements;
}

// Helper to get population by type
function getPopulation(populations, type) {
  if (!populations) return null;

  const typeVariants = {
    'initial-population': ['initial-population', 'initial_population'],
    'initial_population': ['initial-population', 'initial_population'],
    'denominator': ['denominator'],
    'denominator-exclusion': ['denominator-exclusion', 'denominator_exclusion'],
    'denominator_exclusion': ['denominator-exclusion', 'denominator_exclusion'],
    'numerator': ['numerator'],
  };

  const variants = typeVariants[type] || [type];
  return populations.find(p => variants.includes(p.type)) || null;
}

function getGeneratedCode(measure, format) {
  // Use globalConstraints as primary source, fallback to population extraction
  const ageRange = measure.globalConstraints?.ageRange ||
                   extractAgeRange(measure.populations) ||
                   { min: 18, max: 85 };
  const dataElements = collectDataElements(measure.populations);
  const ipPop = getPopulation(measure.populations, 'initial_population');
  const denomPop = getPopulation(measure.populations, 'denominator');
  const exclPop = getPopulation(measure.populations, 'denominator_exclusion');
  const numPop = getPopulation(measure.populations, 'numerator');

  // Build value set declarations from actual measure value sets
  const valueSets = measure.valueSets || [];
  const valueSetDeclarations = valueSets.map((vs) => {
    const url = vs.url || (vs.oid ? `http://cts.nlm.nih.gov/fhir/ValueSet/${vs.oid}` : `urn:oid:2.16.840.1.113883.3.XXX.${vs.id}`);
    return `valueset "${vs.name}": '${url}'`;
  }).join('\n');

  // Build code lists for SQL
  const buildCodeList = (vs) => {
    if (!vs?.codes?.length) return '/* No codes defined */';
    return vs.codes.map((c) => `'${c.code}'`).join(', ');
  };

  if (format === 'cql') {
    // Build population criteria from actual data
    const ipCriteria = ipPop?.narrative || 'Patients meeting initial population criteria';
    const denomCriteria = denomPop?.narrative || 'Initial Population';
    const exclCriteria = exclPop?.narrative || 'Patients with exclusion criteria';
    const numCriteria = numPop?.narrative || 'Patients meeting numerator criteria';

    const ipDefName = ipPop?.cqlDefinitionName || 'Initial Population';
    const denomDefName = denomPop?.cqlDefinitionName || 'Denominator';
    const exclDefName = exclPop?.cqlDefinitionName || 'Denominator Exclusion';
    const numDefName = numPop?.cqlDefinitionName || 'Numerator';

    const libraryName = (measure.metadata.measureId || 'Measure').replace(/[^a-zA-Z0-9]/g, '');
    const libraryUrl = measure.metadata.url || `urn:uuid:${measure.id}`;

    const mpStart = measure.metadata.measurementPeriod?.start || '2025-01-01';
    const mpEnd = measure.metadata.measurementPeriod?.end || '2025-12-31';

    return `/*
 * ${measure.metadata.title || 'Untitled Measure'}
 * Measure ID: ${measure.metadata.measureId || 'Unknown'}
 * Version: ${measure.metadata.version || '1.0'}
 * Scoring: ${measure.metadata.scoring || 'proportion'}
 * Generated: ${new Date().toISOString()}
 *
 * FHIR R4 / QI-Core aligned CQL
 * Library URL: ${libraryUrl}
 *
 * THIS CODE WAS AUTO-GENERATED FROM UMS (FHIR-aligned)
 * Review status: ${measure.reviewProgress?.approved || 0}/${measure.reviewProgress?.total || 1} approved
 */

library ${libraryName} version '${measure.metadata.version || '1.0'}'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers
include QICoreCommon version '2.0.0' called QICoreCommon

codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMEDCT": 'http://snomed.info/sct'
codesystem "ICD10CM": 'http://hl7.org/fhir/sid/icd-10-cm'
codesystem "CPT": 'http://www.ama-assn.org/go/cpt'

// Value Sets from UMS (VSAC canonical URLs)
${valueSetDeclarations || '// No value sets defined'}

parameter "Measurement Period" Interval<DateTime>
  default Interval[@${mpStart}T00:00:00.0, @${mpEnd}T23:59:59.999]

context Patient

/*
 * ${ipDefName}
 * ${ipCriteria}
 */
define "${ipDefName}":
  AgeInYearsAt(date from end of "Measurement Period") in Interval[${ageRange.min}, ${ageRange.max}]
${dataElements.filter(e => e.type === 'diagnosis').map(e => `    and exists "${e.valueSet?.name || 'Qualifying Condition'}"`).join('\n') || ''}
${dataElements.filter(e => e.type === 'encounter').map(e => `    and exists "${e.valueSet?.name || 'Qualifying Encounter'}"`).join('\n') || ''}

/*
 * ${denomDefName}
 * ${denomCriteria}
 */
define "${denomDefName}":
  "${ipDefName}"

/*
 * ${exclDefName}
 * ${exclCriteria}
 */
define "${exclDefName}":
${dataElements.filter(e => exclPop?.criteria && JSON.stringify(exclPop.criteria).includes(e.id)).map(e => `  exists "${e.valueSet?.name || 'Exclusion Condition'}"`).join('\n    or ') || '  false /* No exclusions defined */'}

/*
 * ${numDefName}
 * ${numCriteria}
 */
define "${numDefName}":
${dataElements.filter(e => numPop?.criteria && JSON.stringify(numPop.criteria).includes(e.id)).map(e => `  exists "${e.valueSet?.name || 'Numerator Action'}"`).join('\n    and ') || '  true /* Define numerator criteria */'}

// QI-Core Data Element Definitions
${valueSets.map((vs) => {
  const relatedElement = dataElements.find(e => e.valueSet?.id === vs.id);
  const elemType = relatedElement?.type || 'diagnosis';
  const qicoreType = elemType === 'diagnosis' ? 'Condition' :
                     elemType === 'encounter' ? 'Encounter' :
                     elemType === 'procedure' ? 'Procedure' :
                     elemType === 'observation' ? 'Observation' :
                     elemType === 'medication' ? 'MedicationRequest' :
                     elemType === 'assessment' ? 'Observation' : 'Condition';
  const timing = relatedElement?.timingRequirements?.[0]?.description || 'During Measurement Period';

  return `define "${vs.name}":
  [${qicoreType}: "${vs.name}"] R
    where R.clinicalStatus ~ QICoreCommon."active"
      and (R.onset as Period) overlaps "Measurement Period"
    /* Timing: ${timing} */`;
}).join('\n\n')}
`;
  }

  // Synapse SQL format
  if (format === 'synapse') {
    const measureName = (measure.metadata.measureId || 'Measure').replace(/[^a-zA-Z0-9]/g, '_');
    const mpStart = measure.metadata.measurementPeriod?.start || '2025-01-01';
    const mpEnd = measure.metadata.measurementPeriod?.end || '2025-12-31';

    // Build actual code IN clauses from value sets
    const diagnosisVS = valueSets.find((vs) =>
      dataElements.some(e => e.type === 'diagnosis' && e.valueSet?.id === vs.id)
    );
    const encounterVS = valueSets.find((vs) =>
      dataElements.some(e => e.type === 'encounter' && e.valueSet?.id === vs.id)
    );
    const exclusionVS = valueSets.find((vs) =>
      vs.name?.toLowerCase().includes('hospice') || vs.name?.toLowerCase().includes('exclusion')
    );
    const numeratorVS = valueSets.find((vs) =>
      dataElements.some(e => numPop?.criteria && JSON.stringify(numPop.criteria).includes(e.id) && e.valueSet?.id === vs.id)
    );

    return `/*
 * ${measure.metadata.title || 'Untitled Measure'}
 * Measure ID: ${measure.metadata.measureId || 'Unknown'}
 * Target: Azure Synapse Analytics
 * Generated: ${new Date().toISOString()}
 *
 * Age Range: ${ageRange.min}-${ageRange.max}
 * Value Sets: ${valueSets.length}
 */

DECLARE @MeasurementPeriodStart DATE = '${mpStart}';
DECLARE @MeasurementPeriodEnd DATE = '${mpEnd}';

-- Value Set Reference Tables (populate from UMS)
${valueSets.map((vs) => `-- ${vs.name}: ${vs.codes?.length || 0} codes
-- Codes: ${vs.codes?.slice(0, 5).map((c) => c.code).join(', ')}${vs.codes?.length > 5 ? '...' : ''}`).join('\n')}

-- Initial Population
-- ${ipPop?.narrative || 'Patients meeting initial criteria'}
CREATE OR ALTER VIEW [measure].[${measureName}_InitialPopulation]
AS
SELECT DISTINCT
    p.patient_id,
    p.date_of_birth,
    DATEDIFF(YEAR, p.date_of_birth, @MeasurementPeriodEnd) AS age_at_mp_end
FROM [clinical].[patients] p
INNER JOIN [clinical].[diagnoses] dx
    ON p.patient_id = dx.patient_id
    AND dx.diagnosis_code IN (${buildCodeList(diagnosisVS)})
    AND dx.onset_date <= @MeasurementPeriodEnd
    AND (dx.resolution_date IS NULL OR dx.resolution_date >= @MeasurementPeriodStart)
INNER JOIN [clinical].[encounters] enc
    ON p.patient_id = enc.patient_id
    AND enc.encounter_type_code IN (${buildCodeList(encounterVS)})
    AND enc.encounter_date BETWEEN @MeasurementPeriodStart AND @MeasurementPeriodEnd
WHERE DATEDIFF(YEAR, p.date_of_birth, @MeasurementPeriodEnd) BETWEEN ${ageRange.min} AND ${ageRange.max};
GO

-- Denominator Exclusions
-- ${exclPop?.narrative || 'Patients meeting exclusion criteria'}
CREATE OR ALTER VIEW [measure].[${measureName}_DenominatorExclusions]
AS
SELECT DISTINCT patient_id
FROM (
    SELECT patient_id
    FROM [clinical].[encounters]
    WHERE encounter_type_code IN (${buildCodeList(exclusionVS)})
    AND encounter_date BETWEEN @MeasurementPeriodStart AND @MeasurementPeriodEnd
) exclusions;
GO

-- Numerator
-- ${numPop?.narrative || 'Patients meeting numerator criteria'}
CREATE OR ALTER VIEW [measure].[${measureName}_Numerator]
AS
SELECT DISTINCT patient_id
FROM [clinical].[procedures]
WHERE procedure_code IN (${buildCodeList(numeratorVS)})
AND procedure_date BETWEEN @MeasurementPeriodStart AND @MeasurementPeriodEnd;
GO

-- Final Measure Calculation
CREATE OR ALTER VIEW [measure].[${measureName}_Results]
AS
SELECT
    ip.patient_id,
    ip.age_at_mp_end,
    CASE WHEN ex.patient_id IS NOT NULL THEN 1 ELSE 0 END AS is_excluded,
    CASE WHEN num.patient_id IS NOT NULL THEN 1 ELSE 0 END AS numerator_met,
    CASE
        WHEN ex.patient_id IS NOT NULL THEN 'Excluded'
        WHEN num.patient_id IS NOT NULL THEN 'Performance Met'
        ELSE 'Performance Not Met'
    END AS measure_status
FROM [measure].[${measureName}_InitialPopulation] ip
LEFT JOIN [measure].[${measureName}_DenominatorExclusions] ex
    ON ip.patient_id = ex.patient_id
LEFT JOIN [measure].[${measureName}_Numerator] num
    ON ip.patient_id = num.patient_id
    AND ex.patient_id IS NULL;
GO
`;
  }

  return '// Unknown format';
}
