import React from 'react';

export type DataType = 'scalar' | 'field' | 'color' | 'output';

interface PortProps {
  type: DataType;
  connected?: boolean;
  side: 'input' | 'output';
}

const dataTypeColors: Record<DataType, string> = {
  scalar: '#f59e0b',
  field: '#22d3ee',
  color: '#f472b6',
  output: '#34d399',
};

export const Port: React.FC<PortProps> = ({ type, connected = false, side }) => {
  const color = dataTypeColors[type];

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-150"
      style={{
        [side === 'input' ? 'left' : 'right']: '-6px',
        backgroundColor: connected ? color : 'transparent',
        borderWidth: '2px',
        borderColor: color,
        opacity: connected ? 1 : 0.6,
        boxShadow: connected ? `0 0 8px ${color}40` : 'none',
      }}
    />
  );
};
