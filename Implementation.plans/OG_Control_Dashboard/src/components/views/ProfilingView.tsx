import { useState } from 'react';
import { ProfilingCharts } from '../profiling/ProfilingCharts';
import { LiveStatistics } from '../profiling/LiveStatistics';
import { ProfilingFilters } from '../profiling/ProfilingFilters';

interface ProfilingViewProps {
  isConnected: boolean;
}

export function ProfilingView({ isConnected }: ProfilingViewProps) {
  const [selectedEffect, setSelectedEffect] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'100' | '500' | '1000'>('100');
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="border-b border-[var(--k1-border)]">
        <ProfilingFilters
          selectedEffect={selectedEffect}
          onEffectChange={setSelectedEffect}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          showComparison={showComparison}
          onComparisonToggle={setShowComparison}
          disabled={!isConnected}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 grid grid-cols-[1fr_400px] gap-6">
          {/* Charts Column */}
          <ProfilingCharts
            isConnected={isConnected}
            timeRange={timeRange}
            showComparison={showComparison}
            selectedEffect={selectedEffect}
          />

          {/* Statistics Table Column */}
          <LiveStatistics
            isConnected={isConnected}
            selectedEffect={selectedEffect}
          />
        </div>
      </div>
    </div>
  );
}
