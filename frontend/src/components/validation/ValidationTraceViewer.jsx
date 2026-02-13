import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore.js';

export function ValidationTraceViewer() {
  const { activeMeasure, validationTraces, fetchValidationResults, setActiveTrace, activeTraceId } = useMeasureStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeMeasure?.id) {
      setIsLoading(true);
      fetchValidationResults(activeMeasure.id)
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [activeMeasure?.id, fetchValidationResults]);

  if (!activeMeasure) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a measure to view validation</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const selectedTrace = validationTraces.find(t => t.patientId === activeTraceId);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Patient List */}
      <div className="w-80 border-r border-[var(--border)] overflow-auto">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Test Patients</h2>
          <p className="text-sm text-[var(--text-muted)]">{validationTraces.length} patients</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {validationTraces.map((trace) => (
            <button
              key={trace.patientId}
              onClick={() => setActiveTrace(trace.patientId)}
              className={`w-full p-4 text-left hover:bg-[var(--bg-secondary)] ${
                activeTraceId === trace.patientId ? 'bg-[var(--primary-light)]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{trace.patientName}</span>
                {trace.finalOutcome === 'in_numerator' ? (
                  <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--danger)]" />
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">{trace.finalOutcome}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Trace Details */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedTrace ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">{selectedTrace.patientName}</h2>
            <p className="text-[var(--text-muted)] mb-4">{selectedTrace.narrative}</p>

            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
              <h3 className="font-semibold mb-2">Outcome</h3>
              <p className={`font-medium ${
                selectedTrace.finalOutcome === 'in_numerator' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}>
                {selectedTrace.finalOutcome}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-muted)]">Select a patient to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
