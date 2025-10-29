import { Settings, HelpCircle, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import logoImage from 'figma:asset/8dea8cd0277edf56f4875391a0f1f70359f1254d.png';

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
      className="h-[var(--toolbar-h)] glass-elevated border-b relative z-20 flex items-center px-6 gap-8 shadow-lg"
      style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid' }}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={logoImage} alt="SpectraSynq" className="h-8 w-8 relative z-10" />
          <div className="absolute inset-0 blur-md bg-[var(--k1-accent)] opacity-30 animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[var(--k1-text)] leading-tight">Emotiscope 2.0</span>
          <span className="text-[var(--k1-text-dim)] text-[10px] leading-tight">Control Dashboard</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg shadow-sm">
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
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
            activeView === 'control'
              ? 'glass-strong text-[var(--k1-text)] shadow-md'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:glass'
          }`}
        >
          Control Panel
        </button>
        <button
          onClick={() => onViewChange('profiling')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
            activeView === 'profiling'
              ? 'glass-strong text-[var(--k1-text)] shadow-md'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:glass'
          }`}
        >
          Profiling
        </button>
        <button
          onClick={() => onViewChange('terminal')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
            activeView === 'terminal'
              ? 'glass-strong text-[var(--k1-text)] shadow-md'
              : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:glass'
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
