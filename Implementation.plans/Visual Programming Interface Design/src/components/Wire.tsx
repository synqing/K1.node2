import React from 'react';

export type WireType = 'scalar' | 'field' | 'color' | 'output';

export interface WireProps {
  type: WireType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  selected?: boolean;
  hovered?: boolean;
}

const WIRE_COLORS: Record<WireType, string> = {
  scalar: '#F59E0B',
  field: '#22D3EE',
  color: '#F472B6',
  output: '#34D399'
};

const WIRE_WIDTHS: Record<WireType, number> = {
  scalar: 3,
  field: 4,
  color: 4,
  output: 5
};

export const Wire: React.FC<WireProps> = ({
  type,
  startX,
  startY,
  endX,
  endY,
  selected = false,
  hovered = false
}) => {
  const color = WIRE_COLORS[type];
  const width = WIRE_WIDTHS[type] + (selected ? 1 : 0);
  
  // Calculate Bezier curve control points
  const dx = endX - startX;
  const dy = endY - startY;
  
  // Horizontal S-curve for similar Y coordinates
  const controlPoint1X = startX + dx * 0.4;
  const controlPoint1Y = startY;
  const controlPoint2X = startX + dx * 0.6;
  const controlPoint2Y = endY;
  
  const pathD = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`;
  
  return (
    <g className={`wire wire-${type} ${selected ? 'wire-selected' : ''} ${hovered ? 'wire-hovered' : ''}`}>
      {/* Glow effect */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={0.3}
        filter="url(#wire-glow)"
      />
      
      {/* Main wire */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 2px 8px ${color}4D)`
        }}
      />
    </g>
  );
};
