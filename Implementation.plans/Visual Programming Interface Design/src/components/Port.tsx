import React from 'react';

export type PortType = 'scalar' | 'field' | 'color' | 'output';
export type PortPosition = 'input' | 'output';

export interface PortProps {
  type: PortType;
  connected: boolean;
  position: PortPosition;
  compatible?: boolean;
  style?: React.CSSProperties;
}

const PORT_COLORS: Record<PortType, string> = {
  scalar: '#F59E0B',
  field: '#22D3EE',
  color: '#F472B6',
  output: '#34D399'
};

export const Port: React.FC<PortProps> = ({
  type,
  connected,
  position,
  compatible,
  style
}) => {
  const color = PORT_COLORS[type];
  
  return (
    <div
      className={`port port-${position} port-${type} ${connected ? 'port-connected' : 'port-disconnected'} ${compatible !== undefined ? (compatible ? 'port-compatible' : 'port-incompatible') : ''}`}
      style={{
        ...style,
        '--port-color': color
      } as React.CSSProperties}
    >
      <div className="port-circle" />
    </div>
  );
};
