import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ChevronDown, ChevronUp, Copy, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface TerminalViewProps {
  isConnected: boolean;
  k1Client: any; // TODO: Type this properly
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  text: string;
}

interface CommandHistoryEntry {
  command: string;
  timestamp: Date;
}

const initialLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 120000),
    type: 'info',
    text: 'Emotiscope 2.0 Terminal initialized',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 118000),
    type: 'info',
    text: 'Type "help" for available commands',
  },
];

const commandResponses: Record<string, { type: 'success' | 'error' | 'info'; text: string }> = {
  help: {
    type: 'info',
    text: `Available commands:
  p - Print current effect parameters
  k - Kill current effect
  v - Print firmware version
  j - Print device info (JSON)
  r - Reboot device
  c - Clear terminal
  s - System status`,
  },
  p: {
    type: 'success',
    text: `Current Effect: Analog
  sensitivity: 75%
  decay: 50%
  smoothing: 30%
  peakHold: true`,
  },
  k: {
    type: 'success',
    text: 'Effect stopped',
  },
  v: {
    type: 'info',
    text: 'Emotiscope v2.0.3-beta (build 20251023)',
  },
  j: {
    type: 'info',
    text: `{
  "device": "Emotiscope 2.0",
  "firmware": "2.0.3-beta",
  "uptime": 754,
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF"
}`,
  },
  r: {
    type: 'success',
    text: 'Rebooting device...',
  },
  c: {
    type: 'success',
    text: 'Terminal cleared',
  },
  s: {
    type: 'success',
    text: `System Status:
  CPU: 42% (245μs avg)
  Memory: 65% (12.8KB free)
  FPS: 58
  Temperature: 42°C`,
  },
};

export function TerminalView({ isConnected, k1Client }: TerminalViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const addLog = (type: LogEntry['type'], text: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      text,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const handleCommand = (cmd: string) => {
    if (!cmd.trim()) return;

    // Add command to logs
    addLog('command', cmd);

    // Add to history
    setCommandHistory((prev) => [
      { command: cmd, timestamp: new Date() },
      ...prev.slice(0, 9),
    ]);

    // Process command
    const response = commandResponses[cmd.toLowerCase()];
    if (cmd.toLowerCase() === 'c') {
      setLogs([]);
    } else if (response) {
      setTimeout(() => {
        addLog(response.type, response.text);
      }, 100);
    } else {
      setTimeout(() => {
        addLog('error', `Unknown command: "${cmd}". Type "help" for available commands.`);
      }, 100);
    }

    setCommandInput('');
  };

  const handleClear = () => {
    setLogs([]);
    toast.success('Terminal cleared');
  };

  const handleCopy = () => {
    const text = logs.map((log) => `[${log.timestamp.toLocaleTimeString()}] ${log.text}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Terminal output copied to clipboard');
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'command':
        return 'var(--k1-accent)';
      case 'error':
        return 'var(--k1-error)';
      case 'success':
        return 'var(--k1-success)';
      case 'info':
        return 'var(--k1-text)';
      case 'output':
        return 'var(--k1-text-dim)';
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--k1-text-dim)] mb-4">
            Terminal requires an active device connection
          </p>
          <p className="text-[var(--k1-text-dim)] text-[10px]">
            Connect to your Emotiscope device to access the terminal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Terminal Output */}
      <Card className="flex-1 bg-[var(--k1-bg)] border-[var(--k1-border)] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--k1-border)] bg-[var(--k1-bg-elev)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide">
              Terminal Output
            </span>
            <div className="flex items-center gap-1 text-[8px] text-[var(--k1-text-dim)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--k1-success)] animate-pulse" />
              Live
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7">
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Log Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-1 font-[family-name:var(--k1-code-family)] text-[12px]">
            {logs.length === 0 ? (
              <div className="text-[var(--k1-text-dim)] italic">
                Terminal cleared. Type a command below...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 leading-relaxed">
                  <span className="text-[var(--k1-text-dim)] text-[10px] opacity-60 select-none min-w-[80px]">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <pre
                    className="flex-1 whitespace-pre-wrap"
                    style={{ color: getLogColor(log.type) }}
                  >
                    {log.type === 'command' && '> '}
                    {log.text}
                  </pre>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Auto-scroll Indicator */}
        {!autoScroll && (
          <div className="px-4 py-2 bg-[var(--k1-bg-elev)] border-t border-[var(--k1-border)] text-center">
            <button
              onClick={() => setAutoScroll(true)}
              className="text-[10px] text-[var(--k1-accent)] hover:underline"
            >
              Scroll paused • Click to resume auto-scroll
            </button>
          </div>
        )}
      </Card>

      {/* Command Input */}
      <Card className="bg-[var(--k1-panel)] border-[var(--k1-border)] p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommand(commandInput);
                }
              }}
              placeholder="Enter command... (p, k, v, j, help)"
              className="font-[family-name:var(--k1-code-family)] bg-[var(--k1-bg)] focus:ring-2 focus:ring-[var(--k1-accent)]"
            />
          </div>
          <Button onClick={() => handleCommand(commandInput)}>
            Execute
          </Button>
        </div>
        <p className="text-[8px] text-[var(--k1-text-dim)] mt-2">
          Press Enter to execute • Type "help" for available commands
        </p>
      </Card>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <Card className="bg-[var(--k1-panel)] border-[var(--k1-border)]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-3 flex items-center justify-between hover:bg-[var(--k1-bg-elev)] transition-colors"
          >
            <span className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide">
              Command History ({commandHistory.length})
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-[var(--k1-text-dim)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--k1-text-dim)]" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-[var(--k1-border)]">
              <ScrollArea className="max-h-48">
                <div className="p-2 space-y-1">
                  {commandHistory.map((entry, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCommandInput(entry.command);
                        inputRef.current?.focus();
                      }}
                      className="w-full p-2 rounded hover:bg-[var(--k1-bg-elev)] text-left flex items-center justify-between group transition-colors"
                    >
                      <span className="font-[family-name:var(--k1-code-family)] text-[var(--k1-accent)]">
                        {entry.command}
                      </span>
                      <span className="text-[8px] text-[var(--k1-text-dim)]">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
