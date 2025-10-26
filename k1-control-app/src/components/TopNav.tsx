import { Settings, HelpCircle, Activity } from 'lucide-react';
import { Button } from './ui/button';
// import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
// import logoImage from 'figma:asset/8dea8cd0277edf56f4875391a0f1f70359f1254d.png';
import { Toggle } from './ui/toggle'
import { useEffect, useState } from 'react'

 type ViewType = 'control' | 'profiling' | 'terminal';
 
 interface TopNavProps {
   activeView: ViewType;
   onViewChange: (view: ViewType) => void;
   isConnected: boolean;
   connectionIP: string;
 }
 
 export function TopNav({ activeView, onViewChange, isConnected, connectionIP }: TopNavProps) {
   const [sensDebugOn, setSensDebugOn] = useState<boolean>(typeof localStorage !== 'undefined' && localStorage.getItem('k1.debug.sensitivity') === '1')
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
       </nav>
 
       {/* Actions */}
       <div className="flex items-center gap-2">
         {(import.meta as any).env?.DEV && (
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Toggle
                   pressed={sensDebugOn}
                   onPressedChange={(on) => {
                     try {
                       localStorage.setItem('k1.debug.sensitivity', on ? '1' : '0')
                       window.dispatchEvent(new Event('k1-debug-sensitivity-toggle'))
                       setSensDebugOn(on)
                     } catch (e) { /* noop */ }
                   }}
                   variant="outline"
                   size="sm"
                   aria-label="Toggle sensitivity debug"
                 >
                   <Activity className="h-3 w-3" />
                   <span className="text-[10px]">Sensitivity</span>
                 </Toggle>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Visualize divergence tolerances and live parameter diffs</p>
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
