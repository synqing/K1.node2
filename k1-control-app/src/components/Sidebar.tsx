import { useState } from 'react';
import { Wifi, RefreshCw, Download, Settings, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';

interface SidebarProps {
  isConnected: boolean;
  onConnect: (connected: boolean) => void;
  connectionIP: string;
  onIPChange: (ip: string) => void;
}

export function Sidebar({ isConnected, onConnect, connectionIP, onIPChange }: SidebarProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [serialPort, setSerialPort] = useState('/dev/tty.usbserial-0001');
  const [ipValid, setIpValid] = useState(true);

  const validateIP = (ip: string) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return pattern.test(ip);
  };

  const handleIPChange = (value: string) => {
    onIPChange(value);
    setIpValid(validateIP(value));
  };

  const handleConnect = () => {
    if (!validateIP(connectionIP)) {
      toast.error('Invalid IP address format');
      return;
    }

    setIsConnecting(true);
    setTimeout(() => {
      onConnect(!isConnected);
      setIsConnecting(false);
      if (!isConnected) {
        toast.success('Connected to device', {
          description: `Connected to ${connectionIP}`
        });
      } else {
        toast.info('Disconnected from device');
      }
    }, 1500);
  };

  return (
    <aside className="w-[var(--lib-w)] bg-[var(--k1-bg-elev)] border-r border-[var(--k1-border)] p-4 flex flex-col gap-4 overflow-auto">
      {/* Device Connection Card */}
      <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
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
                placeholder="192.168.1.100"
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
      <div className="space-y-2">
        <h3 className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide px-2">
          Quick Actions
        </h3>
        
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
          onClick={() => toast.success('Profiling data exported')}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Profiling
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

      {/* Connection Help */}
      <div className="mt-auto p-3 bg-[var(--k1-bg)] rounded-lg">
        <p className="text-[10px] text-[var(--k1-text-dim)] leading-relaxed">
          <strong className="text-[var(--k1-accent)]">Tip:</strong> Ensure your Emotiscope device is powered on and connected to the same network.
        </p>
      </div>
    </aside>
  );
}
