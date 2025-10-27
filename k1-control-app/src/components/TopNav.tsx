import { Settings, HelpCircle, Activity, Bug, Play, Pause, Download } from 'lucide-react';
import { Button } from './ui/button';
// import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
// import logoImage from 'figma:asset/8dea8cd0277edf56f4875391a0f1f70359f1254d.png';
import { Toggle } from './ui/toggle'
import { useEffect, useState } from 'react'
import { useK1Actions, useK1State } from '../providers/K1Provider'

 type ViewType = 'control' | 'profiling' | 'terminal' | 'debug';
 
 interface TopNavProps {
   activeView: ViewType;
   onViewChange: (view: ViewType) => void;
   isConnected: boolean;
   connectionIP: string;
   // HUD toggle props
   onToggleHUD?: () => void;
   hudOn?: boolean;
 }
 
 export function TopNav({ activeView, onViewChange, isConnected, connectionIP, onToggleHUD, hudOn }: TopNavProps) {
   const [sensDebugOn, setSensDebugOn] = useState<boolean>(typeof localStorage !== 'undefined' && localStorage.getItem('k1.debug.sensitivity') === '1')
   const k1Actions = useK1Actions()
   const k1State = useK1State()
   useEffect(() => {
     const updateFromStorage = () => {
       try {
         setSensDebugOn(localStorage.getItem('k1.debug.sensitivity') === '1')
       } catch (e) { /* noop */ }
     }
     window.addEventListener('k1-debug-sensitivity-toggle', updateFromStorage)
     window.addEventListener('storage', updateFromStorage)
     return () => {
       window.removeEventListener('k1-debug-sensitivity-toggle', updateFromStorage)
       window.removeEventListener('storage', updateFromStorage)
     }
   }, [])
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
         <button
           onClick={() => onViewChange('debug')}
           className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
             activeView === 'debug'
               ? 'bg-[var(--k1-panel)] text-[var(--k1-text)]'
               : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-panel)]/50'
           }`}
         >
           <Bug className="w-4 h-4" />
           Debug
         </button>
       </nav>
 
       {/* Actions */}
       <div className="flex items-center gap-2">
         {/* HUD toggle */}
         {onToggleHUD && (
           <button
             onClick={onToggleHUD}
             className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${hudOn ? 'bg-[var(--k1-panel)] text-[var(--k1-text)]' : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-panel)]/50'}`}
             title="Toggle Debug HUD (Alt+D)"
           >
             <Activity className="w-4 h-4" />
             HUD
           </button>
         )}

         {/* Global Recording Controls */}
         <div className="flex items-center gap-2">
           <Button
             variant={k1State.recording ? 'destructive' : 'default'}
             size="sm"
             onClick={() => {
               if (k1State.recording) {
                 k1Actions.stopSessionRecording();
               } else {
                 k1Actions.startSessionRecording();
               }
             }}
             disabled={!isConnected}
             className="flex items-center gap-1"
             title={k1State.recording ? 'Stop Recording' : 'Start Recording'}
           >
             {k1State.recording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
             {k1State.recording ? 'Stop' : 'Record'}
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => {
               const res = k1Actions.exportSessionRecording();
               if (res.success && res.data) {
                 const json = JSON.stringify(res.data, null, 2);
                 const blob = new Blob([json], { type: 'application/json' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 const ts = new Date().toISOString().replace(/[:.]/g, '-');
                 a.href = url;
                 a.download = `k1-session-${ts}.json`;
                 a.click();
                 URL.revokeObjectURL(url);
               } else {
                 console.warn('[K1] No session to export');
               }
             }}
             disabled={k1State.recording}
             className="flex items-center gap-1"
             title="Export Session"
           >
             <Download className="w-4 h-4" />
             Export
           </Button>
           {k1State.recording && (
             <div className="flex items-center gap-1 ml-2">
               <div className="w-2 h-2 rounded-full bg-[var(--k1-error)] animate-pulse" />
               <span className="text-[10px] text-[var(--k1-text-dim)]">REC</span>
             </div>
           )}
         </div>

         {(import.meta as any).env?.DEV && (
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Toggle
                   pressed={sensDebugOn}
                   onPressedChange={(v) => {
                     setSensDebugOn(v)
                     try {
                       localStorage.setItem('k1.debug.sensitivity', v ? '1' : '0')
                       window.dispatchEvent(new Event('k1-debug-sensitivity-toggle'))
                     } catch (e) { /* noop */ }
                   }}
                   className="px-3"
                 >
                   Sensitivity Debug
                 </Toggle>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Toggle sensitivity breakdown stats</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         )}

         <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="ghost" size="icon" className="h-8 w-8">
                 <Settings className="h-4 w-4" />
               </Button>
             </TooltipTrigger>
             <TooltipContent>
               <p>Settings</p>
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
