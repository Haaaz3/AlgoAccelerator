import { useState, useEffect, useMemo } from 'react';
import { Key, Brain, CheckCircle, AlertTriangle, ChevronDown, Server, Globe, BarChart3, Download, Trash2, Search, Filter, ToggleLeft, ToggleRight, TrendingUp } from 'lucide-react';
import { useSettingsStore, LLM_PROVIDERS } from '../../stores/settingsStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { getCatalogueTypeOptions } from '../../services/catalogueDetector';

// Pattern labels for display
const PATTERN_LABELS = {
  component_hallucination: 'Hallucinated Component',
  component_missing: 'Missing Component',
  resource_type_misclassification: 'Resource Type',
  value_set_error: 'Value Set',
  timing_interpretation_error: 'Timing',
  negation_logic_error: 'Negation Logic',
  logical_operator_error: 'Logical Operator',
  demographic_constraint_error: 'Demographics',
  code_system_error: 'Code System',
  naming_error: 'Naming',
  other: 'Other',
  unclassified: 'Unclassified',
};

// Severity colors
const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="flex-1 overflow-auto">
      {/* Page Header with Tabs */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 mb-4">
            Configure AI extraction and view analytics
          </p>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[var(--border)] -mb-5">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'feedback'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Extraction Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' ? <SettingsTab /> : <FeedbackTab />}
    </div>
  );
}

function SettingsTab() {
  const {
    selectedProvider,
    selectedModel,
    apiKeys,
    customLlmBaseUrl,
    customLlmModelName,
    vsacApiKey,
    setSelectedProvider,
    setSelectedModel,
    setApiKey,
    setCustomLlmBaseUrl,
    setCustomLlmModelName,
    setVsacApiKey,
  } = useSettingsStore();

  const [apiKeyInput, setApiKeyInput] = useState(apiKeys[selectedProvider] || '');
  const [baseUrlInput, setBaseUrlInput] = useState(customLlmBaseUrl);
  const [modelNameInput, setModelNameInput] = useState(customLlmModelName);

  // Update inputs when provider changes
  useEffect(() => {
    setApiKeyInput(apiKeys[selectedProvider] || '');
  }, [selectedProvider, apiKeys]);

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider);
    setApiKeyInput(apiKeys[provider] || '');
  };

  const saveApiKey = () => {
    setApiKey(selectedProvider, apiKeyInput);
  };

  const saveCustomConfig = () => {
    setCustomLlmBaseUrl(baseUrlInput);
    setCustomLlmModelName(modelNameInput);
    if (apiKeyInput) {
      setApiKey('custom', apiKeyInput);
    }
  };

  const activeApiKey = apiKeys[selectedProvider] || '';

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* LLM Provider Selection */}
        <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text)]">LLM Provider</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {LLM_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedProvider === provider.id
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-sm'
                    : 'border-[var(--border)] hover:border-[var(--accent)] bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {provider.id === 'custom' ? (
                    <Server className="w-4 h-4 text-[var(--info)]" />
                  ) : (
                    <Brain className="w-4 h-4 text-[var(--accent)]" />
                  )}
                  <span className="font-medium text-sm text-[var(--text)]">{provider.name}</span>
                </div>
                <div className="text-xs text-[var(--text-dim)] mt-1 line-clamp-2">{provider.description}</div>
                {apiKeys[provider.id] && (
                  <div className="flex items-center gap-1 text-xs text-[var(--success)] mt-2">
                    <CheckCircle className="w-3 h-3" />
                    Configured
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Model Selection - only for non-custom providers */}
          {selectedProvider !== 'custom' && (
            <div>
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Model</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                >
                  {LLM_PROVIDERS.find(p => p.id === selectedProvider)?.models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)] pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Custom LLM Configuration - only shown when custom is selected */}
        {selectedProvider === 'custom' && (
          <div className="p-5 bg-white border border-[var(--info)]/30 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-[var(--info)]" />
              <h3 className="font-semibold text-[var(--text)]">Custom LLM Configuration</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Configure your self-hosted or custom LLM endpoint. Uses OpenAI-compatible API format.
            </p>

            <div className="space-y-4">
              {/* Base URL */}
              <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">
                  <Globe className="w-4 h-4 inline mr-1" />
                  API Base URL
                </label>
                <input
                  type="text"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--info)]"
                />
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Common endpoints: Ollama (localhost:11434/v1), LM Studio (localhost:1234/v1), vLLM, LocalAI
                </p>
              </div>

              {/* Model Name */}
              <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">Model Name</label>
                <input
                  type="text"
                  value={modelNameInput}
                  onChange={(e) => setModelNameInput(e.target.value)}
                  placeholder="llama2, mistral, codellama, etc."
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--info)]"
                />
              </div>

              {/* API Key (optional for local) */}
              <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">
                  API Key <span className="text-[var(--text-dim)]">(optional for local servers)</span>
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Leave empty for local servers without auth"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--info)]"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={saveCustomConfig}
                className="w-full px-5 py-2.5 bg-[var(--info)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                Save Custom Configuration
              </button>

              {customLlmBaseUrl && (
                <p className="text-sm text-[var(--success)] flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Custom LLM configured: {customLlmBaseUrl}
                </p>
              )}
            </div>
          </div>
        )}

        {/* API Key Configuration - only for non-custom providers */}
        {selectedProvider !== 'custom' && (
          <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-semibold text-[var(--text)]">
                {LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name} API Key
              </h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Enter your API key to enable AI-powered extraction. Your key is stored locally in your browser.
            </p>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  selectedProvider === 'anthropic' ? 'sk-ant-api...' :
                  selectedProvider === 'openai' ? 'sk-...' :
                  'API key...'
                }
                className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={saveApiKey}
                className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
            {activeApiKey && (
              <p className="text-sm text-[var(--success)] mt-3 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                API key configured and saved
              </p>
            )}
            {!activeApiKey && (
              <p className="text-sm text-[var(--warning)] mt-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                API key required for AI extraction
              </p>
            )}
          </div>
        )}

        {/* VSAC Integration */}
        <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text)]">VSAC Integration</h3>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Connect to the Value Set Authority Center (VSAC) to fetch standardized code sets for your measure components.
            Requires a free UMLS account.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                UMLS API Key
              </label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={vsacApiKey}
                  onChange={(e) => setVsacApiKey(e.target.value)}
                  placeholder="Enter your UMLS API key"
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-1.5">
                Get a free API key at{' '}
                <a
                  href="https://uts.nlm.nih.gov/uts/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  uts.nlm.nih.gov
                </a>
                {' '}&rarr; My Profile &rarr; API Key
              </p>
            </div>

            {vsacApiKey && (
              <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                <CheckCircle className="w-4 h-4" />
                VSAC API key configured
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-xl">
          <p className="text-sm text-[var(--accent)]">
            <strong>Privacy Note:</strong> API keys are stored locally in your browser and never sent to our servers.
            All AI extraction calls are made directly from your browser to the LLM provider.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const {
    corrections,
    feedbackEnabled,
    setFeedbackEnabled,
    getFilteredCorrections,
    getPatternStats,
    getAccuracyMetrics,
    exportCorrections,
    deleteCorrection,
    clearAllCorrections,
  } = useFeedbackStore();

  // Filters
  const [catalogueFilter, setCatalogueFilter] = useState('all');
  const [patternFilter, setPatternFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Get filtered corrections
  const filteredCorrections = useMemo(() => {
    return getFilteredCorrections({
      catalogueType: catalogueFilter,
      pattern: patternFilter,
      severity: severityFilter,
      searchText,
    });
  }, [catalogueFilter, patternFilter, severityFilter, searchText, getFilteredCorrections]);

  // Get metrics
  const metrics = useMemo(() => getAccuracyMetrics(catalogueFilter), [catalogueFilter, getAccuracyMetrics]);
  const patternStats = useMemo(() => getPatternStats(catalogueFilter), [catalogueFilter, getPatternStats]);

  // Get top pattern
  const topPattern = patternStats[0];

  // Handle export
  const handleExport = () => {
    const data = exportCorrections({
      catalogueType: catalogueFilter,
      pattern: patternFilter,
      severity: severityFilter,
      searchText,
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-feedback-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle clear all
  const handleClearAll = () => {
    clearAllCorrections();
    setShowClearConfirm(false);
  };

  // Get unique patterns for filter dropdown
  const patternOptions = useMemo(() => {
    const patterns = new Set(corrections.map(c => c.correctionPattern));
    return [
      { value: 'all', label: 'All Patterns' },
      ...Array.from(patterns).map(p => ({
        value: p,
        label: PATTERN_LABELS[p] || p,
      })),
    ];
  }, [corrections]);

  // Catalogue options
  const catalogueOptions = getCatalogueTypeOptions();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toggle and Summary */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedbackEnabled(!feedbackEnabled)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {feedbackEnabled ? (
                <ToggleRight className="w-8 h-8 text-[var(--success)]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-[var(--text-dim)]" />
              )}
              <span className={feedbackEnabled ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>
                Feedback Capture {feedbackEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {corrections.length} corrections recorded
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
            <div className="text-2xl font-semibold text-[var(--text)]">{metrics.totalCorrections}</div>
            <div className="text-sm text-[var(--text-muted)]">Total Corrections</div>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
            <div className="text-2xl font-semibold text-[var(--text)]">{metrics.totalMeasures}</div>
            <div className="text-sm text-[var(--text-muted)]">Measures Reviewed</div>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
            <div className="text-2xl font-semibold text-[var(--text)]">{metrics.avgCorrectionsPerMeasure}</div>
            <div className="text-sm text-[var(--text-muted)]">Avg per Measure</div>
          </div>
          <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
            <div className="text-lg font-semibold text-[var(--text)] truncate">
              {topPattern ? `${PATTERN_LABELS[topPattern.pattern] || topPattern.pattern} (${topPattern.count})` : 'N/A'}
            </div>
            <div className="text-sm text-[var(--text-muted)]">Top Pattern</div>
          </div>
        </div>

        {/* Pattern Breakdown */}
        {patternStats.length > 0 && (
          <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-semibold text-[var(--text)]">Pattern Breakdown</h3>
            </div>
            <div className="space-y-3">
              {patternStats.slice(0, 8).map((stat) => {
                const percentage = metrics.totalCorrections > 0
                  ? Math.round((stat.count / metrics.totalCorrections) * 100)
                  : 0;
                return (
                  <div key={stat.pattern} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-[var(--text)] truncate">
                      {PATTERN_LABELS[stat.pattern] || stat.pattern}
                    </div>
                    <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-[var(--text-muted)] text-right">
                      {stat.count} ({percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={catalogueFilter}
            onChange={(e) => setCatalogueFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)]"
          >
            {catalogueOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)]"
          >
            {patternOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)]"
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
            <input
              type="text"
              placeholder="Search measures..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder-[var(--text-dim)]"
            />
          </div>
        </div>

        {/* Correction Log */}
        <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text)]">Correction Log</h3>
            <div className="text-sm text-[var(--text-muted)]">
              {filteredCorrections.length} corrections
            </div>
          </div>

          {filteredCorrections.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No corrections recorded yet.</p>
              <p className="text-sm mt-1">Edit measure extractions in the UMS Editor to start capturing feedback.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCorrections.slice(0, 50).map((correction) => (
                <div
                  key={correction.id}
                  className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text)] truncate">
                        {correction.measureTitle}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        Field: {correction.fieldLabel}
                        {correction.dataElementName && ` (${correction.dataElementName})`}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCorrection(correction.id)}
                      className="p-1 text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 p-2 bg-[var(--bg)] rounded text-xs font-mono">
                    <span className="text-red-500 line-through">{formatValue(correction.originalValue)}</span>
                    <span className="mx-2 text-[var(--text-muted)]">&rarr;</span>
                    <span className="text-green-600">{formatValue(correction.correctedValue)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded border ${SEVERITY_COLORS[correction.severity]}`}>
                      {correction.severity}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]">
                      {PATTERN_LABELS[correction.correctionPattern] || correction.correctionPattern}
                    </span>
                    <span className="text-xs text-[var(--text-dim)] ml-auto">
                      {new Date(correction.correctionTimestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={corrections.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Corrections (JSON)
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={corrections.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--danger)] text-[var(--danger)] rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Clear All Corrections?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                This will permanently delete all {corrections.length} corrections. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-[var(--danger)] text-white rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format values for display
function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
  }
  return String(value);
}
