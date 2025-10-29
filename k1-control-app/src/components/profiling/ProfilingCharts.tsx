import { Card } from '../ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle } from 'lucide-react';

interface ProfilingChartsProps {
  isConnected: boolean;
  timeRange: '100' | '500' | '1000';
  showComparison: boolean;
  selectedEffect: string;
}

// Mock data generators
const generateFPSData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    frame: i,
    fps: 55 + Math.random() * 10 + Math.sin(i * 0.1) * 3,
  }));
};

const generateFrameTimeData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    frame: i,
    effect: 180 + Math.random() * 50,
    gpu: 60 + Math.random() * 30,
    driver: 40 + Math.random() * 20,
    other: 20 + Math.random() * 15,
  }));
};

const generateCPUByEffect = () => {
  const effects = ['Analog', 'Spectrum', 'Octave', 'Metronome', 'Spectronome', 'Hype', 'Bloom', 'PULSE', 'SPARKLE'];
  return effects.map((effect) => ({
    effect,
    cpu: 150 + Math.random() * 200,
  })).sort((a, b) => b.cpu - a.cpu);
};

const generateMemoryData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    frame: i,
    memory: 50 + Math.random() * 20 + Math.sin(i * 0.05) * 5,
  }));
};

export function ProfilingCharts({ isConnected, timeRange, showComparison: _, selectedEffect: __ }: ProfilingChartsProps) {
  const dataCount = parseInt(timeRange);
  const fpsData = generateFPSData(dataCount);
  const frameTimeData = generateFrameTimeData(dataCount);
  const cpuByEffect = generateCPUByEffect();
  const memoryData = generateMemoryData(dataCount);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)] h-64 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-[var(--k1-text-dim)] mx-auto mb-2" />
              <p className="text-[var(--k1-text-dim)]">
                Connect to device to view profiling data
              </p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FPS Over Time */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="mb-4">
          <h3 className="text-[var(--k1-text)]">FPS Over Time</h3>
          <p className="text-[10px] text-[var(--k1-text-dim)] mt-1">
            Target: 60 FPS • Acceptable: 40+ FPS
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={fpsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
            <XAxis
              dataKey="frame"
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <YAxis
              domain={[0, 70]}
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--k1-bg-elev)',
                border: '1px solid var(--k1-border)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine y={60} stroke="var(--k1-success)" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 10, fill: 'var(--k1-success)' }} />
            <ReferenceLine y={40} stroke="var(--k1-warning)" strokeDasharray="5 5" label={{ value: 'Minimum', fontSize: 10, fill: 'var(--k1-warning)' }} />
            <Line
              type="monotone"
              dataKey="fps"
              stroke="var(--k1-accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Frame Time Breakdown */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="mb-4">
          <h3 className="text-[var(--k1-text)]">Frame Time Breakdown</h3>
          <p className="text-[10px] text-[var(--k1-text-dim)] mt-1">
            Total processing time per component (microseconds)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={frameTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
            <XAxis
              dataKey="frame"
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <YAxis
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--k1-bg-elev)',
                border: '1px solid var(--k1-border)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="effect" stackId="1" stroke="var(--k1-accent)" fill="var(--k1-accent)" fillOpacity={0.6} />
            <Area type="monotone" dataKey="gpu" stackId="1" stroke="var(--k1-accent-2)" fill="var(--k1-accent-2)" fillOpacity={0.6} />
            <Area type="monotone" dataKey="driver" stackId="1" stroke="var(--port-scalar)" fill="var(--port-scalar)" fillOpacity={0.6} />
            <Area type="monotone" dataKey="other" stackId="1" stroke="var(--port-output)" fill="var(--port-output)" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* CPU Usage by Effect */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="mb-4">
          <h3 className="text-[var(--k1-text)]">CPU Usage by Effect</h3>
          <p className="text-[10px] text-[var(--k1-text-dim)] mt-1">
            Average processing time per effect (sorted by load)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={cpuByEffect} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
            <XAxis
              type="number"
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <YAxis
              type="category"
              dataKey="effect"
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--k1-bg-elev)',
                border: '1px solid var(--k1-border)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(0)}μs`, 'CPU Time']}
            />
            <Bar dataKey="cpu" fill="var(--k1-accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Memory Usage */}
      <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="mb-4">
          <h3 className="text-[var(--k1-text)]">Memory Usage</h3>
          <p className="text-[10px] text-[var(--k1-text-dim)] mt-1">
            Heap memory consumption (%) with safety thresholds
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={memoryData}>
            <defs>
              <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--k1-accent)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--k1-accent)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
            <XAxis
              dataKey="frame"
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--k1-text-dim)"
              tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--k1-bg-elev)',
                border: '1px solid var(--k1-border)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine y={70} stroke="var(--k1-warning)" strokeDasharray="5 5" label={{ value: 'Warning', fontSize: 10, fill: 'var(--k1-warning)' }} />
            <ReferenceLine y={85} stroke="var(--k1-error)" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 10, fill: 'var(--k1-error)' }} />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="var(--k1-accent)"
              fill="url(#memGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
