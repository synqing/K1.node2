import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ControlPanelView } from './components/views/ControlPanelView';
import { ProfilingView } from './components/views/ProfilingView';
import { TerminalView } from './components/views/TerminalView';
import { Toaster } from './components/ui/sonner';

type ViewType = 'control' | 'profiling' | 'terminal';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('control');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionIP, setConnectionIP] = useState('192.168.1.100');

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--k1-bg)] text-[var(--k1-text)] overflow-hidden">
      {/* Top Navigation */}
      <TopNav 
        activeView={activeView}
        onViewChange={setActiveView}
        isConnected={isConnected}
        connectionIP={connectionIP}
      />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isConnected={isConnected}
          onConnect={setIsConnected}
          connectionIP={connectionIP}
          onIPChange={setConnectionIP}
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'control' && <ControlPanelView isConnected={isConnected} />}
          {activeView === 'profiling' && <ProfilingView isConnected={isConnected} />}
          {activeView === 'terminal' && <TerminalView isConnected={isConnected} />}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
