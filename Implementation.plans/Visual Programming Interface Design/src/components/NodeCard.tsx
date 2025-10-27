import React from 'react';
import { Port } from './Port';

export type NodeWeight = 'light' | 'heavy';
export type NodeState = 'default' | 'hover' | 'selected' | 'error';
export type PortType = 'scalar' | 'field' | 'color' | 'output';

export interface PortConfig {
  id: string;
  type: PortType;
  connected: boolean;
  position: 'input' | 'output';
}

export interface Parameter {
  label: string;
  value: string;
}

export interface NodeCardProps {
  id: string;
  name: string;
  description: string;
  weight: NodeWeight;
  state?: NodeState;
  parameters?: Parameter[];
  ports?: PortConfig[];
  errorCount?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  id,
  name,
  description,
  weight,
  state = 'default',
  parameters = [],
  ports = [],
  errorCount = 0,
  onMouseEnter,
  onMouseLeave,
  onClick,
  style
}) => {
  const inputPorts = ports.filter(p => p.position === 'input');
  const outputPorts = ports.filter(p => p.position === 'output');
  
  return (
    <div
      className={`node-card node-card-${weight} node-card-${state}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={style}
      data-node-id={id}
    >
      {/* Input Ports */}
      <div className="node-ports-input">
        {inputPorts.map((port, index) => (
          <Port
            key={port.id}
            type={port.type}
            connected={port.connected}
            position="input"
            style={{ top: `${60 + index * 40}px` }}
          />
        ))}
      </div>
      
      {/* Card Content */}
      <div className="node-card-content">
        {/* Header */}
        <div className="node-card-header">
          <div className="node-type-name">{name}</div>
          <div className="node-description">{description}</div>
        </div>
        
        {/* Divider */}
        <div className="node-divider" />
        
        {/* Parameters */}
        {parameters.length > 0 && (
          <div className="node-parameters">
            {parameters.map((param, index) => (
              <div key={index} className="parameter-row">
                <span className="parameter-label">{param.label}</span>
                <span className="parameter-value">{param.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Output Ports */}
      <div className="node-ports-output">
        {outputPorts.map((port, index) => (
          <Port
            key={port.id}
            type={port.type}
            connected={port.connected}
            position="output"
            style={{ top: `${60 + index * 40}px` }}
          />
        ))}
      </div>
      
      {/* Error Badge */}
      {state === 'error' && errorCount > 0 && (
        <div className="node-error-badge">{errorCount}</div>
      )}
    </div>
  );
};
