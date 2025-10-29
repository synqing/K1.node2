import React from 'react';
import { TileParameters } from '../types/tile-types';

interface GlassTileProps {
  parameters: TileParameters;
  size?: 'small' | 'medium' | 'large';
  showContent?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

export function GlassTile({ 
  parameters, 
  size = 'medium', 
  showContent = true,
  onClick,
  isSelected = false
}: GlassTileProps) {
  const sizeClasses = {
    small: 'w-[150px] h-[90px]',
    medium: 'w-[200px] h-[120px]',
    large: 'w-[250px] h-[150px]'
  };

  const contentSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const glowColor = parameters.accentColor === '#06b6d4' ? '6, 182, 212' :
                    parameters.accentColor === '#a855f7' ? '168, 85, 247' :
                    parameters.accentColor === '#fbbf24' ? '251, 191, 36' :
                    '255, 255, 255';

  const surfaceRgb = parameters.surfaceColor === '#ffffff' ? '255, 255, 255' : '255, 255, 255';

  const tileStyle: React.CSSProperties = {
    backdropFilter: `blur(${parameters.blur}px)`,
    WebkitBackdropFilter: `blur(${parameters.blur}px)`,
    background: `rgba(${surfaceRgb}, ${parameters.opacity / 100})`,
    border: `${parameters.borderWidth}px solid rgba(${surfaceRgb}, ${parameters.borderOpacity / 100})`,
    borderRadius: `${parameters.borderRadius}px`,
    boxShadow: `
      0 8px 32px 0 rgba(0, 0, 0, ${parameters.shadowIntensity / 100}),
      0 0 ${parameters.glowIntensity}px rgba(${glowColor}, ${parameters.glowIntensity / 100}),
      inset 0 1px 0 0 rgba(255, 255, 255, ${parameters.borderOpacity / 200})
    `,
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        relative transition-all duration-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-cyan-400 scale-105' : 'hover:scale-105'}
      `}
      style={tileStyle}
      onClick={onClick}
    >
      {showContent && (
        <div className={`p-4 h-full flex flex-col justify-between ${contentSizes[size]}`}>
          <div>
            <div className="text-white/90 mb-1">{parameters.name}</div>
            <div className="text-white/60">Interactive Tile</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-white/80">●●●●</div>
            <div className="text-white/70">→</div>
          </div>
        </div>
      )}
    </div>
  );
}
