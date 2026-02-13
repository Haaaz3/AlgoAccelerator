import { useState } from 'react';
import { Code, Loader } from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore.js';

export function CodeGeneration() {
  const { activeMeasure, generateCql, generateSql, selectedCodeFormat, setSelectedCodeFormat } = useMeasureStore();
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  if (!activeMeasure) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a measure to generate code</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const code = selectedCodeFormat === 'cql'
        ? await generateCql(activeMeasure.id)
        : await generateSql(activeMeasure.id);
      setGeneratedCode(code || 'No code generated');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          Code Generation: {activeMeasure.measureId}
        </h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedCodeFormat}
            onChange={(e) => setSelectedCodeFormat(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)]"
          >
            <option value="cql">CQL</option>
            <option value="synapse">SQL (Synapse)</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-[var(--danger-light)] border border-[var(--danger-border)] rounded-lg">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      <div className="flex-1 bg-[var(--code-bg)] border border-[var(--border)] rounded-lg overflow-auto">
        <pre className="p-4 text-sm font-mono">
          <code>{generatedCode || '// Click "Generate" to create code'}</code>
        </pre>
      </div>
    </div>
  );
}
