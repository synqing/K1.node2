import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DataType } from './Port';

interface WireProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: DataType;
  selected?: boolean;
  highlighted?: boolean;
}

const dataTypeColors: Record<DataType, string> = {
  scalar: '#f59e0b',
  field: '#22d3ee',
  color: '#f472b6',
  output: '#34d399',
};

const dataTypeWidths: Record<DataType, number> = {
  scalar: 3,
  field: 4,
  color: 4,
  output: 5,
};

export const Wire: React.FC<WireProps> = ({ from, to, type, selected = false, highlighted = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const color = dataTypeColors[type];
  const baseWidth = dataTypeWidths[type];
  const width = selected ? baseWidth + 1 : baseWidth;

  // Calculate bezier curve control points
  // For primarily horizontal connections, create smooth S-curve
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point distance is 40% of horizontal distance
  const controlDistance = Math.abs(dx) * 0.4;

  const cp1x = from.x + controlDistance;
  const cp1y = from.y;
  const cp2x = to.x - controlDistance;
  const cp2y = to.y;

  // SVG path for bezier curve
  const path = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;

  // Calculate bounding box for SVG viewBox
  const minX = Math.min(from.x, to.x, cp1x, cp2x) - 20;
  const minY = Math.min(from.y, to.y, cp1y, cp2y) - 20;
  const maxX = Math.max(from.x, to.x, cp1x, cp2x) + 20;
  const maxY = Math.max(from.y, to.y, cp1y, cp2y) + 20;

  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;

  // Adjust path to account for viewBox offset
  const adjustedPath = `M ${from.x - minX} ${from.y - minY} C ${cp1x - minX} ${cp1y - minY}, ${cp2x - minX} ${cp2y - minY}, ${to.x - minX} ${to.y - minY}`;

  const shadowBlur = isHovered ? 16 : 8;
  const shadowOpacity = isHovered ? 0.5 : 0.3;
  const glowOpacity = isHovered ? 0.2 : 0;

  return (
    <svg
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width: viewBoxWidth,
        height: viewBoxHeight,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      <defs>
        <filter id={`wire-glow-${type}-${from.x}-${from.y}`}>
          <feGaussianBlur stdDeviation={shadowBlur} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shadow/glow layer */}
      <motion.path
        d={adjustedPath}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeOpacity={shadowOpacity}
        filter={`url(#wire-glow-${type}-${from.x}-${from.y})`}
        style={{ pointerEvents: 'stroke' }}
        initial={false}
        animate={{
          strokeOpacity: isHovered ? 0.6 : shadowOpacity,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Main wire */}
      <motion.path
        d={adjustedPath}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={highlighted ? '6 3' : undefined}
        style={{ 
          pointerEvents: 'stroke',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{
          strokeWidth: isHovered ? width + 0.5 : width,
          opacity: isHovered ? 1 : selected ? 0.95 : 0.85,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Hover glow overlay */}
      {isHovered && (
        <motion.path
          d={adjustedPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={width}
          strokeLinecap="round"
          strokeOpacity={glowOpacity}
          style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
          initial={{ strokeOpacity: 0 }}
          animate={{ strokeOpacity: glowOpacity }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Selected pulse animation */}
      {selected && (
        <motion.path
          d={adjustedPath}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
          animate={{
            strokeOpacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </svg>
  );
};
