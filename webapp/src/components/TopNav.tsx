import { Activity, Wifi, WifiOff } from 'lucide-react';
import { Badge } from './ui/badge';

interface TopNavProps {
  currentView: 'control' | 'analysis' | 'profiling' | 'terminal' | 'graph';
  onViewChange: (view: 'control' | 'analysis' | 'profiling' | 'terminal' | 'graph') => void;
  connected: boolean;
  deviceIp?: string;
}

export function TopNav({ currentView, onViewChange, connected, deviceIp }: TopNavProps) {
  return (
    <div className="h-14 border-b border-[var(--prism-bg-elevated)] bg-[var(--prism-bg-surface)] flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--prism-gold)]" />
          <span className="font-bebas text-lg tracking-wide text-[var(--prism-text-primary)]">
            PRISM.node2
          </span>
        </div>
        
        <div className="h-6 w-px bg-[var(--prism-bg-elevated)] mx-2" />
        
        <nav className="flex gap-1">
          {(['control', 'analysis', 'profiling', 'terminal', 'graph'] as const).map((view) => (
            <button
              key={view}
              onMouseEnter={() => {
                // Prefetch view bundles on hover for snappier nav
                if (view === 'analysis') {
                  void import('../components/views/AnalysisView');
                  void import('recharts');
                } else if (view === 'profiling') {
                  void import('./views/ProfilingView');
                  void import('./profiling/ProfilingCharts');
                  void import('recharts');
                } else if (view === 'terminal') {
                  void import('./views/TerminalView');
                } else if (view === 'graph') {
                  void import('./views/GraphEditorView');
                  // Defer Radix UI until needed; prefetch on hover
                  void import('@radix-ui/react-dialog');
                  void import('@radix-ui/react-tabs');
                }
              }}
              onClick={() => onViewChange(view)}
              className={`px-4 py-1.5 rounded-md transition-colors capitalize ${
                currentView === view
                  ? 'bg-[var(--prism-bg-elevated)] text-[var(--prism-text-primary)]'
                  : 'text-[var(--prism-text-secondary)] hover:text-[var(--prism-text-primary)] hover:bg-[var(--prism-bg-elevated)]/50'
              }`}
            >
              {view}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <Wifi className="w-4 h-4 text-[var(--prism-success)]" />
            <Badge variant="outline" className="border-[var(--prism-success)] text-[var(--prism-success)] bg-[var(--prism-success)]/10">
              {deviceIp || 'Connected'}
            </Badge>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-[var(--prism-text-secondary)]" />
            <Badge variant="outline" className="border-[var(--prism-text-secondary)] text-[var(--prism-text-secondary)]">
              Disconnected
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
