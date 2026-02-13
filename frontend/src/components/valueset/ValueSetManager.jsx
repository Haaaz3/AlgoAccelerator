import { useMeasureStore } from '../../stores/measureStore.js';

export function ValueSetManager() {
  const { measures, activeMeasure } = useMeasureStore();

  // Collect all value sets from all measures
  const allValueSets = measures.flatMap(m => (m.valueSets || []).map(vs => ({
    ...vs,
    measureId: m.measureId || m.id,
    measureTitle: m.title,
  })));

  // Deduplicate by OID
  const uniqueValueSets = Array.from(
    new Map(allValueSets.map(vs => [vs.oid || vs.id, vs])).values()
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">Value Set Library</h1>

      {uniqueValueSets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[var(--text-muted)]">No value sets found in measures</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {uniqueValueSets.map((vs) => (
            <div
              key={vs.oid || vs.id}
              className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{vs.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{vs.oid}</p>
                </div>
                {vs.verified && (
                  <span className="px-2 py-1 text-xs bg-[var(--success-light)] text-[var(--success)] rounded-full">
                    Verified
                  </span>
                )}
              </div>
              {vs.codes && vs.codes.length > 0 && (
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  {vs.codes.length} codes
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
