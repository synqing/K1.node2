import { useState } from 'react';
import { Wifi, RefreshCw, Download, Settings, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { ConnectionStatus } from '../types/k1-types';
import { useK1Actions } from '../providers/K1Provider';

interface SidebarProps {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  onConnect: () => Promise<void>;
  connectionIP: string;
  onIPChange: (ip: string) => void;
}

export function Sidebar({ isConnected, connectionStatus: _, onConnect, connectionIP, onIPChange }: SidebarProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [serialPort, setSerialPort] = useState('/dev/tty.usbserial-0001');
  const [ipValid, setIpValid] = useState(true);
  const actions = useK1Actions();

  const validateIP = (ip: string) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return pattern.test(ip);
  };

  const handleIPChange = (value: string) => {
    onIPChange(value);
    setIpValid(validateIP(value));
  };

  const handleConnect = async () => {
    if (!validateIP(connectionIP)) {
      toast.error('Invalid IP address format');
      return;
    }

    setIsConnecting(true);
    try {
      if (isConnected) {
        await actions.disconnect();
        toast.info('Disconnected from device');
      } else {
        await actions.connect(connectionIP);
        toast.success('Connected to device', {
          description: `Connected to ${connectionIP}`
        });
      }
    } catch (error) {
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Backup/restore handler functions
  const handleBackup = async () => {
    try {
      const backup = await actions.backupConfig();
      
      // Create and download backup file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `k1-config-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Configuration backed up successfully');
    } catch (error) {
      toast.error('Failed to backup configuration', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const configData = JSON.parse(text);
      
      const result = await actions.restoreConfig(configData);
      
      if (result.success) {
        toast.success('Configuration restored successfully');
      } else {
        toast.error('Failed to restore configuration', {
          description: result.message || 'Unknown error'
        });
      }
    } catch (error) {
      toast.error('Failed to restore configuration', {
        description: error instanceof Error ? error.message : 'Invalid file format'
      });
    }
  };

  const openRestorePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleRestoreFile(file);
      }
    };
    input.click();
  };

  return (
    <aside className="w-[var(--lib-w)] bg-[var(--k1-bg-elev)] border-r border-[var(--k1-border)] p-6 flex flex-col gap-6 overflow-auto">
      {/* Device Connection Card */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-4 h-4 text-[var(--k1-accent)]" />
          <h3 className="text-[var(--k1-text)]">Device Connection</h3>
        </div>

        <div className="space-y-3">
          {/* IP Input */}
          <div className="space-y-1.5">
            <Label htmlFor="ip-input" className="text-[var(--k1-text-dim)]">
              IP Address
            </Label>
            <div className="relative">
              <Input
                id="ip-input"
                value={connectionIP}
                onChange={(e) => handleIPChange(e.target.value)}
                placeholder="k1-reinvented.local or 192.168.1.103"
                className={`font-[family-name:var(--k1-code-family)] ${
                  !ipValid ? 'border-[var(--k1-error)]' : ''
                }`}
                disabled={isConnected}
              />
              {!ipValid && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--k1-error)]" />
              )}
            </div>
            {!ipValid && (
              <p className="text-[var(--k1-error)] text-[10px]">
                Please enter a valid IP address
              </p>
            )}
          </div>

          {/* Serial Port Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="serial-select" className="text-[var(--k1-text-dim)]">
              Serial Port
            </Label>
            <Select value={serialPort} onValueChange={setSerialPort} disabled={isConnected}>
              <SelectTrigger id="serial-select" className="font-[family-name:var(--k1-code-family)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/dev/tty.usbserial-0001">/dev/tty.usbserial-0001</SelectItem>
                <SelectItem value="/dev/tty.usbserial-0002">/dev/tty.usbserial-0002</SelectItem>
                <SelectItem value="COM3">COM3</SelectItem>
                <SelectItem value="COM4">COM4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !ipValid}
            className="w-full"
            variant={isConnected ? "destructive" : "default"}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Disconnect
              </>
            ) : (
              'Connect'
            )}
          </Button>

          {/* Connection Stats */}
          {isConnected && (
            <div className="pt-3 border-t border-[var(--k1-border)] space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--k1-text-dim)]">Uptime</span>
                <span className="text-[var(--k1-text)] font-[family-name:var(--k1-code-family)]">
                  00:12:34
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--k1-text-dim)]">Latency</span>
                <span className="text-[var(--k1-success)] font-[family-name:var(--k1-code-family)]">
                  45ms
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--k1-text-dim)]">Packets</span>
                <span className="text-[var(--k1-text)] font-[family-name:var(--k1-code-family)]">
                  1,234 sent
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <h3 className="text-[var(--k1-text)] mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            disabled={!isConnected}
            onClick={() => toast.success('Device data refreshed')}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            disabled={!isConnected}
            onClick={handleBackup}
          >
            <Download className="w-4 h-4 mr-2" />
            Backup Config
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            disabled={!isConnected}
            onClick={openRestorePicker}
          >
            <Settings className="w-4 h-4 mr-2" />
            Restore Config
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            disabled={!isConnected}
          >
            <Settings className="w-4 h-4 mr-2" />
            Device Settings
          </Button>
        </div>
      </Card>

      {/* Connection Help */}
      <div className="mt-auto p-3 bg-[var(--k1-bg)] rounded-lg">
        <p className="text-[10px] text-[var(--k1-text-dim)] leading-relaxed">
          <strong className="text-[var(--k1-accent)]">Tip:</strong> Ensure your Emotiscope device is powered on and connected to the same network.
        </p>
      </div>
    </aside>
  );
}
