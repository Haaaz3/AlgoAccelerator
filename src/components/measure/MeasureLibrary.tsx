import { useState, useCallback } from 'react';
import { Upload, FileText, Trash2, Clock, CheckCircle, AlertTriangle, Lock, Unlock, Shield, Key, Settings, Brain, Zap, ChevronDown, Beaker } from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore';
import { useSettingsStore, LLM_PROVIDERS, type LLMProvider } from '../../stores/settingsStore';
import { ingestMeasureFiles, ingestMeasureFilesDirect, type IngestionProgress } from '../../services/measureIngestion';
import { createSampleCRCMeasure } from '../../data/sampleMeasures';
import type { UniversalMeasureSpec } from '../../types/ums';

export function MeasureLibrary() {
  const { measures, addMeasure, deleteMeasure, setActiveMeasure, getReviewProgress, lockMeasure, unlockMeasure } = useMeasureStore();
  const {
    selectedProvider,
    selectedModel,
    apiKeys,
    useAIExtraction,
    setSelectedProvider,
    setSelectedModel,
    setApiKey,
    setUseAIExtraction,
    getActiveApiKey,
    getActiveProvider,
  } = useSettingsStore();

  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<IngestionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKeys[selectedProvider] || '');

  // Supported file extensions
  const SUPPORTED_EXTENSIONS = ['.pdf', '.html', '.htm', '.xlsx', '.xls', '.csv', '.xml', '.json', '.cql', '.txt', '.zip'];

  const isFileSupported = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const supportedFiles = files.filter(isFileSupported);

    if (supportedFiles.length === 0) {
      setError('Please upload measure specification files (PDF, HTML, Excel, XML, JSON, CQL, or ZIP)');
      return;
    }

    // AI mode requires API key
    const activeApiKey = getActiveApiKey();
    const activeProvider = getActiveProvider();
    if (useAIExtraction && !activeApiKey) {
      setError(`Please configure your ${activeProvider.name} API key in settings to use AI-powered extraction, or switch to Quick Parse mode`);
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'loading', message: 'Starting...', progress: 0 });

    try {
      // Use either AI extraction or direct parsing based on toggle
      const result = useAIExtraction
        ? await ingestMeasureFiles(supportedFiles, activeApiKey, setProgress, selectedProvider, selectedModel)
        : await ingestMeasureFilesDirect(supportedFiles, setProgress);

      if (result.success && result.ums) {
        addMeasure(result.ums);
        setProgress({ stage: 'complete', message: `Successfully imported "${result.ums.metadata.title}"`, progress: 100 });

        // Clear progress after a delay
        setTimeout(() => setProgress(null), 3000);
      } else {
        setError(result.error || 'Failed to extract measure specification');
        setProgress(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  }, [getActiveApiKey, getActiveProvider, addMeasure, useAIExtraction, selectedProvider, selectedModel]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await handleFiles(Array.from(files));
    e.target.value = '';
  }, [handleFiles]);

  const saveApiKey = () => {
    setApiKey(selectedProvider, apiKeyInput);
  };

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setApiKeyInput(apiKeys[provider] || '');
  };

  const activeApiKey = apiKeys[selectedProvider] || '';

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-red-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Measure Library</h1>
            <p className="text-[var(--text-muted)]">
              Upload measure specifications for AI-powered extraction and UMS generation
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              activeApiKey
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
            title={activeApiKey ? 'API key configured' : 'Configure API key'}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl space-y-6">
            {/* Extraction Mode */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-[var(--text)]">Extraction Mode</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg p-1">
                  <button
                    onClick={() => setUseAIExtraction(true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      useAIExtraction
                        ? 'bg-cyan-500 text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    AI Extraction
                  </button>
                  <button
                    onClick={() => setUseAIExtraction(false)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      !useAIExtraction
                        ? 'bg-emerald-500 text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Quick Parse
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-2">
                {useAIExtraction
                  ? 'Uses AI for intelligent extraction (recommended for complex measures)'
                  : 'Fast local parsing without AI (limited extraction quality)'}
              </p>
            </div>

            {/* LLM Provider Selection */}
            <div className="border-t border-[var(--border)] pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-[var(--text)]">LLM Provider</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {LLM_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedProvider === provider.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[var(--border)] hover:border-[var(--text-dim)]'
                    }`}
                  >
                    <div className="font-medium text-sm text-[var(--text)]">{provider.name}</div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">{provider.description}</div>
                    {apiKeys[provider.id] && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2">
                        <CheckCircle className="w-3 h-3" />
                        Configured
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Model Selection */}
              <div className="mb-4">
                <label className="text-sm text-[var(--text-muted)] mb-2 block">Model</label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text)] appearance-none cursor-pointer focus:outline-none focus:border-cyan-500"
                  >
                    {LLM_PROVIDERS.find(p => p.id === selectedProvider)?.models.map((model) => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* API Key Configuration */}
            <div className="border-t border-[var(--border)] pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-[var(--text)]">
                  {LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name} API Key
                </h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Enter your API key to enable AI-powered extraction. Your key is stored locally.
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
                  className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
                >
                  Save
                </button>
              </div>
              {activeApiKey && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  API key configured
                </p>
              )}
              {useAIExtraction && !activeApiKey && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  API key required for AI extraction
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all mb-8
            ${isProcessing
              ? 'border-cyan-500/50 bg-cyan-500/5'
              : dragActive
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-[var(--border)] hover:border-[var(--text-dim)] hover:bg-[var(--bg-secondary)]'
            }
          `}
        >
          <input
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />

          {isProcessing && progress ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Brain className="w-12 h-12 text-cyan-400" />
                  <Zap className="w-5 h-5 text-amber-400 absolute -right-1 -bottom-1 animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-[var(--text)] font-medium mb-2">{progress.message}</p>
                <div className="w-80 mx-auto h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                {progress.details && (
                  <p className="text-xs text-[var(--text-dim)] mt-2">{progress.details}</p>
                )}
              </div>
            </div>
          ) : progress?.stage === 'complete' ? (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
              <p className="text-emerald-400 font-medium">{progress.message}</p>
            </div>
          ) : (
            <>
              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-400' : 'text-[var(--text-dim)]'}`} />
              <p className="text-[var(--text)] font-medium mb-1">
                Drop measure specification files here
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Upload multiple files together for comprehensive extraction
              </p>
              <p className="text-xs text-[var(--text-dim)] mt-3">
                Supports PDF, HTML, Excel, XML, JSON, CQL, and ZIP packages
              </p>
              <p className="text-xs text-[var(--text-dim)]">
                Compatible with eCQM, MIPS CQM, HEDIS, QOF, and registry formats
              </p>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => {
              const sampleMeasure = createSampleCRCMeasure();
              addMeasure(sampleMeasure);
              setProgress({ stage: 'complete', message: 'Loaded sample CRC Screening measure', progress: 100 });
              setTimeout(() => setProgress(null), 3000);
            }}
            className="px-4 py-2 bg-purple-500/15 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/25 transition-colors flex items-center gap-2"
          >
            <Beaker className="w-4 h-4" />
            Load Sample Measure (CRC Screening)
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Extraction Error</p>
              <p className="text-sm text-red-300/80 mt-1 whitespace-pre-wrap">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              &times;
            </button>
          </div>
        )}

        {/* Measures Grid */}
        {measures.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Imported Measures ({measures.length})
            </h2>
            <div className="grid gap-4">
              {measures.map((measure) => (
                <MeasureCard
                  key={measure.id}
                  measure={measure}
                  reviewProgress={getReviewProgress(measure.id)}
                  onSelect={() => setActiveMeasure(measure.id)}
                  onDelete={() => {
                    if (measure.lockedAt) {
                      alert('Cannot delete a locked measure. Unlock it first.');
                      return;
                    }
                    if (confirm(`Delete "${measure.metadata.title}"?`)) {
                      deleteMeasure(measure.id);
                    }
                  }}
                  onLock={() => lockMeasure(measure.id)}
                  onUnlock={() => unlockMeasure(measure.id)}
                  getConfidenceColor={getConfidenceColor}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No measures imported yet</p>
            <p className="text-sm mt-1">Upload specification files to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MeasureCard({
  measure,
  reviewProgress,
  onSelect,
  onDelete,
  onLock,
  onUnlock,
  getConfidenceColor,
}: {
  measure: UniversalMeasureSpec;
  reviewProgress: { approved: number; total: number; pending: number; flagged: number };
  onSelect: () => void;
  onDelete: () => void;
  onLock: () => void;
  onUnlock: () => void;
  getConfidenceColor: (c: string) => string;
}) {
  const { approved, total, flagged } = reviewProgress;
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
  const isLocked = !!measure.lockedAt;
  const canLock = progress === 100 && !isLocked;

  return (
    <div
      className={`bg-[var(--bg-secondary)] border rounded-xl p-5 transition-colors cursor-pointer group ${
        isLocked
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-[var(--border)] hover:border-cyan-500/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--bg-tertiary)] rounded border border-[var(--border)]">
              {measure.metadata.measureId}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/15 text-cyan-400 rounded">
              {measure.metadata.program.replace('_', ' ')}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getConfidenceColor(measure.overallConfidence)} bg-current/10`}>
              {measure.overallConfidence} confidence
            </span>
            {isLocked && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Locked for Publish
              </span>
            )}
          </div>

          <h3 className="text-[var(--text)] font-semibold mb-1 truncate group-hover:text-cyan-400 transition-colors">
            {measure.metadata.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
            {measure.metadata.description}
          </p>

          <div className="flex items-center gap-6 mt-4 text-xs text-[var(--text-dim)]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {isLocked ? `Locked ${new Date(measure.lockedAt!).toLocaleDateString()}` : `Updated ${new Date(measure.updatedAt).toLocaleDateString()}`}
            </span>
            <span className={`flex items-center gap-1.5 ${progress === 100 ? 'text-emerald-400' : ''}`}>
              <CheckCircle className="w-3.5 h-3.5" />
              {approved}/{total} reviewed
            </span>
            {flagged > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {flagged} flagged
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            {canLock && (
              <button
                onClick={(e) => { e.stopPropagation(); onLock(); }}
                className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Lock for publish"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            {isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnlock(); }}
                className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Unlock for editing"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 text-[var(--text-dim)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth="4"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke={isLocked ? '#34d399' : progress === 100 ? '#34d399' : '#7dd3fc'}
                strokeWidth="4"
                strokeDasharray={`${progress * 1.256} 126`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${isLocked ? 'text-emerald-400' : ''}`}>
              {isLocked ? <Lock className="w-4 h-4" /> : `${progress}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
