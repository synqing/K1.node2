import { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ControlPanelView } from './components/views/ControlPanelView';
import { ProfilingView } from './components/views/ProfilingView';
import { TerminalView } from './components/views/TerminalView';
import { Toaster } from './components/ui/sonner';
import { K1Client } from './api/k1-client';
import { ConnectionStatus } from './types/k1-types';

type ViewType = 'control' | 'profiling' | 'terminal';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('control');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionIP, setConnectionIP] = useState('192.168.1.100');
  const [k1Client, setK1Client] = useState<K1Client | null>(null);

  // Initialize K1 client when IP changes
  useEffect(() => {
    const client = new K1Client(connectionIP);
    setK1Client(client);
  }, [connectionIP]);

  // Test connection when client changes
  useEffect(() => {
    if (k1Client) {
      testConnection();
    }
  }, [k1Client]);

  const testConnection = async () => {
    if (!k1Client) return;
    
    setConnectionStatus('connecting');
    try {
      const isConnected = await k1Client.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    }
  };

  const handleConnect = async () => {
    await testConnection();
  };

  const isConnected = connectionStatus === 'connected';

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
          connectionStatus={connectionStatus}
          onConnect={handleConnect}
          connectionIP={connectionIP}
          onIPChange={setConnectionIP}
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'control' && (
            <ControlPanelView 
              isConnected={isConnected} 
              k1Client={k1Client}
            />
          )}
          {activeView === 'profiling' && (
            <ProfilingView 
              isConnected={isConnected}
              k1Client={k1Client}
            />
          )}
          {activeView === 'terminal' && (
            <TerminalView 
              isConnected={isConnected}
              k1Client={k1Client}
            />
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
