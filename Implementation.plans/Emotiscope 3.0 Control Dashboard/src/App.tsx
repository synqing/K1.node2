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
    <div className="h-screen w-screen flex flex-col bg-pattern text-[var(--k1-text)] overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 bg-[var(--k1-accent)] -top-48 -left-48 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-10 bg-[var(--k1-accent-2)] -bottom-48 -right-48 animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 bg-[var(--k1-success)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* Top Navigation */}
      <TopNav 
        activeView={activeView}
        onViewChange={setActiveView}
        isConnected={isConnected}
        connectionIP={connectionIP}
      />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden relative z-10">
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
