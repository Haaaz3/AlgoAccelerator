import { useEffect } from 'react';
import { useMeasureStore } from './stores/measureStore';
import { useComponentLibraryStore } from './stores/componentLibraryStore';
import { Sidebar } from './components/layout/Sidebar';
import { MeasureLibrary } from './components/measure/MeasureLibrary';
import { UMSEditor } from './components/measure/UMSEditor';
import { ValidationTraceViewer } from './components/validation/ValidationTraceViewer';
import { CodeGeneration } from './components/measure/CodeGeneration';
import { ValueSetManager } from './components/valueset/ValueSetManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { LibraryBrowser } from './components/library/LibraryBrowser';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function App() {
  const { activeTab, loadFromApi: loadMeasures, isLoadingFromApi: measuresLoading } = useMeasureStore();
  const { loadFromApi: loadComponents, isLoadingFromApi: componentsLoading } = useComponentLibraryStore();

  // Load measures and components from backend API on mount
  useEffect(() => {
    loadMeasures();
    loadComponents();
  }, [loadMeasures, loadComponents]);

  const isLoading = measuresLoading || componentsLoading;

  return (
    <div className="h-screen flex">
      <Sidebar />
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Loading from backend...</span>
            </div>
          </div>
        </div>
      )}
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
