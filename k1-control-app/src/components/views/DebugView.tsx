import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Activity, History, Volume2, AlertCircle, Play, Pause, Download } from 'lucide-react';
import { PatternPerformanceMonitor } from '../debug/PatternPerformanceMonitor';
import { ParameterHistory } from '../debug/ParameterHistory';
import { AudioReactiveDebug } from '../debug/AudioReactiveDebug';
import { Button } from '../ui/button';
import { useK1Actions, useK1State } from '../../providers/K1Provider';

interface DebugViewProps {
  isConnected: boolean;
  k1Client: any;
  initialTab?: 'performance' | 'parameters' | 'audio';
}

export function DebugView({ isConnected, k1Client, initialTab }: DebugViewProps) {
  const [activeTab, setActiveTab] = useState('performance');
  const k1Actions = useK1Actions();
  const k1State = useK1State();

  // Sync initial tab prop to local tab state
  useEffect(() => {
    if (!initialTab) return;
    const mapped = initialTab === 'parameters' ? 'history' : initialTab;
    setActiveTab(mapped);
  }, [initialTab]);

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center bg-[var(--k1-panel)] border-[var(--k1-border)]">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--k1-text-dim)]" />
          <h3 className="text-lg font-semibold text-[var(--k1-text)] mb-2">Device Not Connected</h3>
          <p className="text-[var(--k1-text-dim)]">
            Connect to a K1 device to access debugging features
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Global Recording Controls */}
      <Card className="mx-4 my-4 p-3 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="flex items-center justify-between">
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
          <div className="text-[10px] text-[var(--k1-text-dim)]">
            Recording captures realtime performance & audio metrics globally
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-[var(--k1-panel)] border-b border-[var(--k1-border)]">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Monitor
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Parameter History
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="flex-1 mt-0">
          <PatternPerformanceMonitor isConnected={isConnected} k1Client={k1Client} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0">
          <ParameterHistory isConnected={isConnected} k1Client={k1Client} />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 mt-0">
          <AudioReactiveDebug isConnected={isConnected} k1Client={k1Client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}