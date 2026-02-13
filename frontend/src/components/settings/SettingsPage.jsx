import { useSettingsStore, LLM_PROVIDERS } from '../../stores/settingsStore.js';

export function SettingsPage() {
  const {
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    apiKeys,
    setApiKey,
    useBackendApi,
    setUseBackendApi,
    backendUrl,
    setBackendUrl,
  } = useSettingsStore();

  const currentProviderConfig = LLM_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Backend API Settings */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Backend API</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useBackendApi}
                onChange={(e) => setUseBackendApi(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Use Backend API</span>
            </label>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Backend URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg"
                placeholder="http://localhost:8080"
              />
            </div>
          </div>
        </div>

        {/* LLM Provider Settings */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">LLM Provider</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)]"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {currentProviderConfig && (
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)]"
                >
                  {currentProviderConfig.models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">API Key</label>
              <input
                type="password"
                value={apiKeys[selectedProvider] || ''}
                onChange={(e) => setApiKey(selectedProvider, e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg"
                placeholder="Enter API key"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
