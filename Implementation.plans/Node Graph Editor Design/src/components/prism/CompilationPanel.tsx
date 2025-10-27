import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface CompilationPanelProps {
  status: 'passing' | 'warning' | 'error' | 'checking';
  nodeCount: number;
  edgeCount: number;
  outdegreeMin: number;
  outdegreeMax: number;
  outdegreeAvg: number;
  isDAG: boolean;
  predictedTime: number;
  cpuUsage: number;
  topoTime: number;
  errorCount: number;
  errors?: string[];
  changedNodes?: string[];
  impactedNodes?: string[];
}

const statusColors = {
  passing: '#22dd88',
  warning: '#f59e0b',
  error: '#ef4444',
  checking: '#6b7280',
};

export const CompilationPanel: React.FC<CompilationPanelProps> = ({
  status,
  nodeCount,
  edgeCount,
  outdegreeMin,
  outdegreeMax,
  outdegreeAvg,
  isDAG,
  predictedTime,
  cpuUsage,
  topoTime,
  errorCount,
  errors = [],
  changedNodes = [],
  impactedNodes = [],
}) => {
  const frameBudget120fps = 8.33;
  const frameBudget60fps = 16.66;
  const exceedsBudget120 = predictedTime > frameBudget120fps;
  const exceedsBudget60 = predictedTime > frameBudget60fps;

  const cpuBarColor = cpuUsage < 50 ? '#22dd88' : cpuUsage < 80 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="fixed right-0 top-0 h-screen flex flex-col"
      style={{
        width: '320px',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTopLeftRadius: '16px',
        borderBottomLeftRadius: '16px',
        boxShadow: `
          0 12px 24px rgba(0, 0, 0, 0.32),
          0 32px 64px rgba(0, 0, 0, 0.48),
          inset 0 1px 2px rgba(255, 255, 255, 0.15),
          inset 0 -1px 1px rgba(0, 0, 0, 0.1)
        `,
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* Base glass layers */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      />

      {/* Light source gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 200px 200px at 20% 20%, 
            rgba(255, 255, 255, 0.14) 0%, 
            rgba(255, 255, 255, 0.03) 40%, 
            transparent 60%)`,
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      />

      {/* Environmental reflection */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
            rgba(110, 231, 243, 0.06) 0%, 
            transparent 50%)`,
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      />

      {/* Scrim for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(28, 33, 48, 0.5)',
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{
              backgroundColor: statusColors[status],
              boxShadow: `0 0 12px ${statusColors[status]}80`,
            }}
          />
          <div className="font-bebas" style={{ fontSize: '16px', color: '#e6e9ef' }}>
            COMPILATION STATUS
          </div>
        </div>

        {/* Section: Graph Health */}
        <div className="flex flex-col gap-3">
          <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            GRAPH HEALTH
          </div>
          <div className="flex flex-col gap-2 font-rama" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            <div>
              N: {nodeCount} • M: {edgeCount}
            </div>
            <div className="font-jetbrains" style={{ fontSize: '13px', opacity: 0.9 }}>
              Outdegree min/max/avg: {outdegreeMin}/{outdegreeMax}/{outdegreeAvg.toFixed(1)}
            </div>
            <div className="flex items-center gap-2">
              <span>DAG:</span>
              {isDAG ? (
                <Check size={16} style={{ color: '#22dd88' }} />
              ) : (
                <X size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
          </div>
          {!isDAG && (
            <button
              className="px-3 py-1.5 rounded-lg font-rama transition-colors"
              style={{
                fontSize: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              Highlight Cycles
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Section: Performance Budget */}
        <div className="flex flex-col gap-3">
          <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            PERFORMANCE BUDGET
          </div>
          <div className="flex flex-col gap-2 font-jetbrains" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            <div
              style={{
                color: exceedsBudget60 ? '#ef4444' : exceedsBudget120 ? '#f59e0b' : '#e6e9ef',
              }}
            >
              Predicted: {predictedTime.toFixed(2)} ms
            </div>
            <div>CPU: {cpuUsage}%</div>
            <div style={{ opacity: 0.8 }}>Topo time: {topoTime.toFixed(2)} ms</div>
          </div>

          {/* CPU Bar Graph */}
          <div className="flex flex-col gap-1">
            <div className="relative h-4 rounded overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div
                className="absolute left-0 top-0 h-full transition-all duration-300"
                style={{
                  width: `${cpuUsage}%`,
                  background: `linear-gradient(to right, #22dd88 0%, #f59e0b 50%, #ef4444 100%)`,
                  clipPath: `inset(0 ${100 - cpuUsage}% 0 0)`,
                }}
              />
              <div
                className="absolute top-0 h-full w-0.5"
                style={{
                  left: `${cpuUsage}%`,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
                }}
              />
            </div>
          </div>

          {/* Frame budget warnings */}
          {exceedsBudget120 && (
            <div className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <AlertTriangle size={14} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
              <span className="font-rama" style={{ fontSize: '11px', color: '#f59e0b', lineHeight: '1.4' }}>
                {exceedsBudget60
                  ? 'Exceeds 60 FPS budget (16.66ms)'
                  : 'Exceeds 120 FPS budget (8.33ms)'}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Section: Validation */}
        <div className="flex flex-col gap-3">
          <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            SEMANTICS
          </div>
          <div className="font-jetbrains" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            Errors: {errorCount}
          </div>
          {errors.length > 0 && (
            <div className="flex flex-col gap-2">
              {errors.slice(0, 5).map((error, index) => (
                <div
                  key={index}
                  className="p-2 rounded font-rama"
                  style={{
                    fontSize: '13px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#b5bdca',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    lineHeight: '1.4',
                  }}
                >
                  {error}
                </div>
              ))}
              {errors.length > 5 && (
                <div className="font-rama" style={{ fontSize: '11px', color: '#b5bdca', opacity: 0.6 }}>
                  and {errors.length - 5} more...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Section: Risk Preview */}
        <div className="flex flex-col gap-3">
          <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
            RISK PREVIEW
          </div>
          {changedNodes.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="font-rama" style={{ fontSize: '12px', color: '#b5bdca', opacity: 0.8 }}>
                Changed:
              </div>
              <div className="font-jetbrains" style={{ fontSize: '12px', color: '#f59e0b', lineHeight: '1.6' }}>
                {changedNodes.slice(0, 10).join(', ')}
                {changedNodes.length > 10 && ` and ${changedNodes.length - 10} more...`}
              </div>
            </div>
          )}
          {impactedNodes.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="font-rama" style={{ fontSize: '12px', color: '#b5bdca', opacity: 0.8 }}>
                Impacted:
              </div>
              <div className="font-jetbrains" style={{ fontSize: '12px', color: '#f59e0b', opacity: 0.7, lineHeight: '1.6' }}>
                {impactedNodes.slice(0, 10).join(', ')}
                {impactedNodes.length > 10 && ` and ${impactedNodes.length - 10} more...`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
