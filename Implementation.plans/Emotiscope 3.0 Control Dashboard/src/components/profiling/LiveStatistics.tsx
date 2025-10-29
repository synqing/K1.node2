import { useState } from 'react';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface LiveStatisticsProps {
  isConnected: boolean;
  selectedEffect: string;
}

interface Metric {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'error';
  unit: string;
}

const mockMetrics: Metric[] = [
  { id: 'fps-avg', label: 'Avg FPS', value: '58.4', trend: 'stable', status: 'good', unit: '' },
  { id: 'fps-min', label: 'Min FPS', value: '52.1', trend: 'down', status: 'warning', unit: '' },
  { id: 'fps-max', label: 'Max FPS', value: '60.0', trend: 'up', status: 'good', unit: '' },
  { id: 'frame-avg', label: 'Avg Frame Time', value: '245', trend: 'stable', status: 'good', unit: 'μs' },
  { id: 'frame-max', label: 'Max Frame Time', value: '412', trend: 'up', status: 'warning', unit: 'μs' },
  { id: 'cpu-avg', label: 'Avg CPU', value: '42', trend: 'stable', status: 'good', unit: '%' },
  { id: 'cpu-peak', label: 'Peak CPU', value: '68', trend: 'up', status: 'warning', unit: '%' },
  { id: 'mem-used', label: 'Memory Used', value: '14.2', trend: 'up', status: 'good', unit: 'KB' },
  { id: 'mem-peak', label: 'Peak Memory', value: '18.7', trend: 'stable', status: 'warning', unit: 'KB' },
  { id: 'dropped', label: 'Dropped Frames', value: '3', trend: 'stable', status: 'good', unit: '' },
  { id: 'latency', label: 'Audio Latency', value: '12.3', trend: 'down', status: 'good', unit: 'ms' },
  { id: 'buffer', label: 'Buffer Health', value: '94', trend: 'stable', status: 'good', unit: '%' },
];

export function LiveStatistics({ isConnected, selectedEffect }: LiveStatisticsProps) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getStatusColor = (status: Metric['status']) => {
    switch (status) {
      case 'good':
        return 'var(--k1-success)';
      case 'warning':
        return 'var(--k1-warning)';
      case 'error':
        return 'var(--k1-error)';
    }
  };

  const getTrendIcon = (trend: Metric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      case 'stable':
        return <Minus className="w-3 h-3" />;
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)] h-full flex items-center justify-center">
        <p className="text-[var(--k1-text-dim)]">
          No statistics available
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[var(--k1-text)]">Live Statistics</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-[var(--k1-success)] animate-pulse" />
            <p className="text-[10px] text-[var(--k1-text-dim)]">
              Updating ~2Hz
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <ScrollArea className="h-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[var(--k1-border)]">
                <TableHead className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide">
                  Metric
                </TableHead>
                <TableHead className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide text-right">
                  <button
                    onClick={() => setSortBy(sortBy === 'value' ? null : 'value')}
                    className="flex items-center gap-1 ml-auto hover:text-[var(--k1-text)]"
                  >
                    Value
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-[var(--k1-text-dim)] text-[10px] uppercase tracking-wide text-right">
                  Trend
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMetrics.map((metric) => (
                <TableRow
                  key={metric.id}
                  onMouseEnter={() => setHoveredRow(metric.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`border-[var(--k1-border)] transition-colors cursor-pointer ${
                    hoveredRow === metric.id ? 'bg-[var(--k1-bg-elev)]' : ''
                  }`}
                >
                  <TableCell className="text-[var(--k1-text)]">
                    {metric.label}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className="font-[family-name:var(--k1-code-family)]"
                      style={{ color: getStatusColor(metric.status) }}
                    >
                      {metric.value}
                      {metric.unit && (
                        <span className="text-[var(--k1-text-dim)] ml-1">
                          {metric.unit}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end"
                      style={{ color: getStatusColor(metric.status) }}
                    >
                      {getTrendIcon(metric.trend)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Footer Hint */}
        <div className="p-3 border-t border-[var(--k1-border)] bg-[var(--k1-bg)]">
          <p className="text-[8px] text-[var(--k1-text-dim)] text-center">
            Click any metric to drill down • Hover to highlight
          </p>
        </div>
      </Card>
    </div>
  );
}
