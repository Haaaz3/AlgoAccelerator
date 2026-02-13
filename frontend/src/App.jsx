import { useEffect } from 'react';
import { useMeasureStore } from './stores/measureStore.js';
import { useComponentLibraryStore } from './stores/componentLibraryStore.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { MeasureLibrary } from './components/measure/MeasureLibrary.jsx';
import { UMSEditor } from './components/measure/UMSEditor.jsx';
import { ValidationTraceViewer } from './components/validation/ValidationTraceViewer.jsx';
import { CodeGeneration } from './components/measure/CodeGeneration.jsx';
import { ValueSetManager } from './components/valueset/ValueSetManager.jsx';
import { SettingsPage } from './components/settings/SettingsPage.jsx';
import { LibraryBrowser } from './components/library/LibraryBrowser.jsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.jsx';

function App() {
  const { activeTab, fetchMeasures } = useMeasureStore();
  const { initialize: initializeComponents } = useComponentLibraryStore();

  // Fetch data on mount
  useEffect(() => {
    fetchMeasures();
    initializeComponents();
  }, [fetchMeasures, initializeComponents]);

  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'library' && <MeasureLibrary />}
        {activeTab === 'valuesets' && (
          <ErrorBoundary fallbackName="Value Set Manager">
            <ValueSetManager />
          </ErrorBoundary>
        )}
        {activeTab === 'editor' && (
          <ErrorBoundary fallbackName="Measure Editor">
            <UMSEditor />
          </ErrorBoundary>
        )}
        {activeTab === 'validation' && (
          <ErrorBoundary fallbackName="Validation Viewer">
            <ValidationTraceViewer />
          </ErrorBoundary>
        )}
        {activeTab === 'codegen' && (
          <ErrorBoundary fallbackName="Code Generation">
            <CodeGeneration />
          </ErrorBoundary>
        )}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'components' && (
          <ErrorBoundary fallbackName="Component Library">
            <LibraryBrowser />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default App;
