import { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ControlPanelView } from './components/views/ControlPanelView';
import { ProfilingView } from './components/views/ProfilingView';
import { TerminalView } from './components/views/TerminalView';
import { DebugView } from './components/views/DebugView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorProvider } from './hooks/useErrorHandler';
import { DeviceDiscoveryModal } from './components/DeviceDiscoveryModal';
import { Toaster } from './components/ui/sonner';
import { K1Client } from './api/k1-client';
import { ConnectionStatus, K1DiscoveredDevice } from './types/k1-types';
import { K1Provider } from './providers/K1Provider';
import { K1StatusTest } from './components/K1StatusTest';
import { DebugHUD } from './components/debug/DebugHUD';
import { DevDebugPanel } from './components/debug/DevDebugPanel';

type ViewType = 'control' | 'profiling' | 'terminal' | 'debug';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('control');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionIP, setConnectionIP] = useState('192.168.1.100');
  const [k1Client, setK1Client] = useState<K1Client | null>(null);
  const [showDebugHUD, setShowDebugHUD] = useState(false);
  const [debugInitialTab, setDebugInitialTab] = useState<'performance' | 'parameters' | 'audio'>('performance');

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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.shiftKey && e.code === 'KeyD') {
        setShowDebugHUD((v) => !v);
      }
      if (e.altKey && e.shiftKey && e.code === 'KeyP') {
        setDebugInitialTab('performance');
        setActiveView('debug');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const handleDiscoveryComplete = async (device: K1DiscoveredDevice) => {
    setConnectionIP(`${device.ip}:${device.port}`);
    // Connection will be tested automatically by useEffect
  };

  const isConnected = connectionStatus === 'connected';
  const devApiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:8000';

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <K1Provider initialEndpoint={connectionIP}>
          <div className="h-screen w-screen flex flex-col bg-[var(--k1-bg)] text-[var(--k1-text)] overflow-hidden">
          {(import.meta as any).env?.DEV && (
            <div className="px-3 py-1 text-xs bg-[var(--k1-panel)] text-[var(--k1-text-dim)] border-b border-[var(--k1-border)] flex items-center justify-between">
              <span>Dev API base: {devApiBase}</span>
              <K1StatusTest />
            </div>
          )}

          {/* Top Navigation */}
          <TopNav
            activeView={activeView}
            onViewChange={setActiveView}
            isConnected={isConnected}
            connectionIP={connectionIP}
            onToggleHUD={() => setShowDebugHUD((v) => !v)}
            hudOn={showDebugHUD}
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
              {activeView === 'debug' && (
                <DebugView
                  isConnected={isConnected}
                  k1Client={k1Client}
                />
              )}
            </main>
          </div>

          {/* Debug HUD */}
          {showDebugHUD && (
            <DebugHUD k1Client={k1Client} isConnected={isConnected} onClose={() => setShowDebugHUD(false)} />
          )}

          {/* Device Discovery Modal (Phase 1 Week 1) */}
          <DeviceDiscoveryModal
            isOpen={!isConnected}
            isConnected={isConnected}
            onDiscoveryComplete={handleDiscoveryComplete}
          />

            {/* Toast Notifications */}
            <Toaster />
            {(import.meta as any).env?.DEV && (
              <DevDebugPanel collapsedInitially={true} />
            )}
          </div>
        </K1Provider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}
