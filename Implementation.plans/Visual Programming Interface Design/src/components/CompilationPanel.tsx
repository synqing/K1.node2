import React from 'react';

export interface GraphHealth {
  nodes: number;
  edges: number;
  outdegreeMin: number;
  outdegreeMax: number;
  outdegreeAvg: number;
  isDAG: boolean;
}

export interface Performance {
  predicted: number;
  cpu: number;
  topoTime: number;
}

export interface ValidationError {
  message: string;
  nodeName: string;
}

export interface RiskPreview {
  changed: string[];
  impacted: string[];
}

export interface CompilationPanelProps {
  status: 'all-pass' | 'warnings' | 'failures' | 'checking';
  graphHealth: GraphHealth;
  performance: Performance;
  errors: ValidationError[];
  risk: RiskPreview;
}

export const CompilationPanel: React.FC<CompilationPanelProps> = ({
  status,
  graphHealth,
  performance,
  errors,
  risk
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'all-pass': return '#22DD88';
      case 'warnings': return '#F59E0B';
      case 'failures': return '#EF4444';
      case 'checking': return '#7A8194';
    }
  };
  
  const getPerformanceColor = (ms: number) => {
    if (ms < 8.33) return '#22DD88';
    if (ms < 16.66) return '#F59E0B';
    return '#EF4444';
  };
  
  const cpuPercentage = Math.min(100, performance.cpu);
  
  return (
    <div className="compilation-panel">
      <div className="compilation-panel-content">
        {/* Header */}
        <div className="panel-header">
          <h2 className="panel-title">COMPILATION STATUS</h2>
          <div 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor() }}
          />
        </div>
        
        {/* Graph Health Section */}
        <div className="panel-section">
          <h3 className="section-title">GRAPH HEALTH</h3>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">N: {graphHealth.nodes} • M: {graphHealth.edges}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">
                Outdegree min/max/avg: {graphHealth.outdegreeMin}/{graphHealth.outdegreeMax}/{graphHealth.outdegreeAvg.toFixed(1)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">DAG: </span>
              <span 
                className="metric-value"
                style={{ color: graphHealth.isDAG ? '#22DD88' : '#EF4444' }}
              >
                {graphHealth.isDAG ? '✓' : '✗'}
              </span>
            </div>
            {!graphHealth.isDAG && (
              <button className="action-button">Highlight Cycles</button>
            )}
          </div>
        </div>
        
        {/* Performance Budget Section */}
        <div className="panel-section">
          <h3 className="section-title">PERFORMANCE BUDGET</h3>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">Predicted:</span>
              <span 
                className="metric-value metric-data"
                style={{ color: getPerformanceColor(performance.predicted) }}
              >
                {performance.predicted.toFixed(2)} ms
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">CPU:</span>
              <span className="metric-value metric-data">{performance.cpu.toFixed(0)}%</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Topo time:</span>
              <span className="metric-value metric-data">{performance.topoTime.toFixed(2)} ms</span>
            </div>
            
            {/* CPU Bar Graph */}
            <div className="cpu-bar-container">
              <div className="cpu-bar-background">
                <div 
                  className="cpu-bar-fill"
                  style={{ width: `${cpuPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Validation Section */}
        <div className="panel-section">
          <h3 className="section-title">SEMANTICS</h3>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">Errors:</span>
              <span className="metric-value metric-data">{errors.length}</span>
            </div>
            
            {errors.length === 0 ? (
              <div className="success-message">✓ All validations passed</div>
            ) : (
              <div className="error-list">
                {errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-message">{error.message}</span>
                    <span className="error-node">{error.nodeName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Risk Preview Section */}
        <div className="panel-section">
          <h3 className="section-title">RISK PREVIEW</h3>
          <div className="section-content">
            {risk.changed.length > 0 && (
              <div className="risk-group">
                <span className="risk-label">Changed:</span>
                <div className="risk-nodes">
                  {risk.changed.slice(0, 10).map((node, index) => (
                    <span key={index} className="risk-node risk-node-changed">
                      <span className="risk-dot" />
                      {node}
                    </span>
                  ))}
                  {risk.changed.length > 10 && (
                    <span className="risk-more">...and {risk.changed.length - 10} more</span>
                  )}
                </div>
              </div>
            )}
            
            {risk.impacted.length > 0 && (
              <div className="risk-group">
                <span className="risk-label">Impacted:</span>
                <div className="risk-nodes">
                  {risk.impacted.slice(0, 10).map((node, index) => (
                    <span key={index} className="risk-node risk-node-impacted">
                      <span className="risk-dot" />
                      {node}
                    </span>
                  ))}
                  {risk.impacted.length > 10 && (
                    <span className="risk-more">...and {risk.impacted.length - 10} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
