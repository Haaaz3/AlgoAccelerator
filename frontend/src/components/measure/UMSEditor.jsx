import { useMeasureStore } from '../../stores/measureStore.js';

export function UMSEditor() {
  const { activeMeasure } = useMeasureStore();

  if (!activeMeasure) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a measure to edit</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">
        UMS Editor: {activeMeasure.title}
      </h1>

      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Measure Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Measure ID</dt>
            <dd className="font-medium">{activeMeasure.measureId}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Status</dt>
            <dd className="font-medium">{activeMeasure.status || 'Draft'}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Program</dt>
            <dd className="font-medium">{activeMeasure.program || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Populations</dt>
            <dd className="font-medium">{activeMeasure.populations?.length || 0}</dd>
          </div>
        </dl>

        {activeMeasure.description && (
          <div className="mt-6">
            <h3 className="text-sm text-[var(--text-muted)] mb-2">Description</h3>
            <p className="text-sm">{activeMeasure.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
