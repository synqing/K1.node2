import { Settings, HelpCircle, Activity } from 'lucide-react';
import { Button } from './ui/button';
// import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
// import logoImage from 'figma:asset/8dea8cd0277edf56f4875391a0f1f70359f1254d.png';

type ViewType = 'control' | 'profiling' | 'terminal';

interface TopNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isConnected: boolean;
  connectionIP: string;
}

export function TopNav({ activeView, onViewChange, isConnected, connectionIP }: TopNavProps) {
  return (
    <header 
      className="h-[var(--toolbar-h)] bg-[var(--k1-bg-elev)] border-b border-[var(--k1-border)] flex items-center px-6 gap-8"
      style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid' }}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--k1-accent)] to-[var(--k1-accent-2)] rounded-lg flex items-center justify-center">
          <span className="text-[var(--k1-bg)] font-bold text-sm">K1</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[var(--k1-text)] leading-tight">K1.reinvented</span>
          <span className="text-[var(--k1-text-dim)] text-[10px] leading-tight">Control Interface</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--k1-panel)] rounded-lg">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--k1-success)]' : 'bg-[var(--k1-text-dim)]'}`} />
        <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)]">
          {isConnected ? connectionIP : 'Disconnected'}
        </span>
        {isConnected && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Activity className="w-3 h-3 text-[var(--k1-success)]" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Connection active • 45ms latency</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* View Tabs */}
      <nav className="flex gap-1 flex-1">
        <button
          onClick={() => onViewChange('control')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'control'
              ? 'bg-[var(--k1-panel)] text-[var(--k1-text)]'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-panel)]/50'
          }`}
        >
          Control Panel
        </button>
        <button
          onClick={() => onViewChange('profiling')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'profiling'
              ? 'bg-[var(--k1-panel)] text-[var(--k1-text)]'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-panel)]/50'
          }`}
        >
          Profiling
        </button>
        <button
          onClick={() => onViewChange('terminal')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'terminal'
              ? 'bg-[var(--k1-panel)] text-[var(--k1-text)]'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-panel)]/50'
          }`}
        >
          Terminal
        </button>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Device Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Help & Documentation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
