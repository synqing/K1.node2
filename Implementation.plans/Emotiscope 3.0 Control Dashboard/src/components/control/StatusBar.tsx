import { Activity, Cpu, HardDrive } from 'lucide-react';
import { Progress } from '../ui/progress';

interface StatusBarProps {
  isConnected: boolean;
}

export function StatusBar({ isConnected }: StatusBarProps) {
  // Mock data - would be real-time in actual implementation
  const fps = isConnected ? 58 : 0;
  const cpuUsage = isConnected ? 245 : 0; // microseconds
  const cpuPercent = isConnected ? 42 : 0;
  const memoryFree = isConnected ? 12847 : 0; // KB
  const memoryPercent = isConnected ? 65 : 0;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'var(--k1-success)';
    if (fps >= 40) return 'var(--k1-warning)';
    return 'var(--k1-error)';
  };

  const getCPUColor = (usage: number) => {
    if (usage < 300) return 'var(--k1-success)';
    if (usage < 500) return 'var(--k1-warning)';
    return 'var(--k1-error)';
  };

  const getMemoryColor = (percent: number) => {
    if (percent < 70) return 'var(--k1-success)';
    if (percent < 85) return 'var(--k1-warning)';
    return 'var(--k1-error)';
  };

  if (!isConnected) {
    return (
      <div className="h-14 sm:h-16 glass-elevated border-t relative z-10 flex items-center justify-center px-3 shadow-lg">
        <p className="text-[var(--k1-text-dim)] text-sm sm:text-base text-center">
          Connect to device to view live performance metrics
        </p>
      </div>
    );
  }

  return (
    <div className="h-14 sm:h-16 glass-elevated border-t relative z-10 px-3 sm:px-6 flex items-center gap-4 sm:gap-8 overflow-x-auto shadow-lg">
      {/* FPS */}
      <div className="flex items-center gap-3">
        <Activity className="w-4 h-4" style={{ color: getFPSColor(fps) }} />
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[var(--k1-text-dim)]">FPS</span>
            <span
              className="font-[family-name:var(--k1-code-family)]"
              style={{ color: getFPSColor(fps) }}
            >
              {fps}
            </span>
          </div>
          <div className="text-[8px] text-[var(--k1-text-dim)]">
            Target: 60
          </div>
        </div>
      </div>

      {/* CPU Usage */}
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <Cpu className="w-4 h-4" style={{ color: getCPUColor(cpuUsage) }} />
        <div className="flex-1 space-y-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--k1-text-dim)]">CPU</span>
              <span
                className="font-[family-name:var(--k1-code-family)] text-[10px]"
                style={{ color: getCPUColor(cpuUsage) }}
              >
                {cpuUsage}μs
              </span>
            </div>
            <span className="text-[var(--k1-text-dim)] text-[10px]">
              {cpuPercent}%
            </span>
          </div>
          <Progress
            value={cpuPercent}
            className="h-1.5"
            indicatorClassName={cpuUsage < 300 ? 'bg-[var(--k1-success)]' : cpuUsage < 500 ? 'bg-[var(--k1-warning)]' : 'bg-[var(--k1-error)]'}
          />
        </div>
      </div>

      {/* Memory Usage */}
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <HardDrive className="w-4 h-4" style={{ color: getMemoryColor(memoryPercent) }} />
        <div className="flex-1 space-y-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--k1-text-dim)]">Memory</span>
              <span
                className="font-[family-name:var(--k1-code-family)] text-[10px]"
                style={{ color: getMemoryColor(memoryPercent) }}
              >
                {memoryFree}KB free
              </span>
            </div>
            <span className="text-[var(--k1-text-dim)] text-[10px]">
              {memoryPercent}%
            </span>
          </div>
          <Progress
            value={memoryPercent}
            className="h-1.5"
            indicatorClassName={memoryPercent < 70 ? 'bg-[var(--k1-success)]' : memoryPercent < 85 ? 'bg-[var(--k1-warning)]' : 'bg-[var(--k1-error)]'}
          />
          {memoryPercent > 85 && (
            <p className="text-[8px] text-[var(--k1-error)]">
              ⚠️ Low memory warning
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
