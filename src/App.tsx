import { useMeasureStore } from './stores/measureStore';
import { Sidebar } from './components/layout/Sidebar';
import { MeasureLibrary } from './components/measure/MeasureLibrary';
import { UMSEditor } from './components/measure/UMSEditor';
import { ValidationTraceViewer } from './components/validation/ValidationTraceViewer';
import { CodeGeneration } from './components/measure/CodeGeneration';
import { ValueSetManager } from './components/valueset/ValueSetManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { LibraryBrowser } from './components/library/LibraryBrowser';

function App() {
  const { activeTab } = useMeasureStore();

  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'library' && <MeasureLibrary />}
        {activeTab === 'valuesets' && <ValueSetManager />}
        {activeTab === 'editor' && <UMSEditor />}
        {activeTab === 'validation' && <ValidationTraceViewer />}
        {activeTab === 'codegen' && <CodeGeneration />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'components' && <LibraryBrowser />}
      </main>
    </div>
  );
}

export default App;
