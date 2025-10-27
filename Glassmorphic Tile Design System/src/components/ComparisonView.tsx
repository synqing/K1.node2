import React from 'react';
import { TileParameters } from '../types/tile-types';
import { GlassTile } from './GlassTile';
import { ArrowRight, ArrowLeftRight } from 'lucide-react';

interface ComparisonViewProps {
  tileA: TileParameters;
  tileB: TileParameters;
}

export function ComparisonView({ tileA, tileB }: ComparisonViewProps) {
  const compareParameter = (key: keyof TileParameters, labelA: string = 'A', labelB: string = 'B') => {
    const valueA = tileA[key];
    const valueB = tileB[key];
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      const diff = valueB - valueA;
      const diffPercent = valueA !== 0 ? ((diff / valueA) * 100).toFixed(0) : '∞';
      
      return {
        valueA,
        valueB,
        diff,
        diffPercent,
        isDifferent: Math.abs(diff) > 0.001
      };
    }
    
    return {
      valueA,
      valueB,
      diff: 0,
      diffPercent: '0',
      isDifferent: valueA !== valueB
    };
  };

  const parameters = [
    { key: 'blur' as const, label: 'Blur Radius', unit: 'px' },
    { key: 'opacity' as const, label: 'Surface Opacity', unit: '%' },
    { key: 'borderOpacity' as const, label: 'Border Opacity', unit: '%' },
    { key: 'shadowIntensity' as const, label: 'Shadow Intensity', unit: '%' },
    { key: 'glowIntensity' as const, label: 'Glow Intensity', unit: '%' },
    { key: 'borderRadius' as const, label: 'Border Radius', unit: 'px' },
    { key: 'borderWidth' as const, label: 'Border Width', unit: 'px' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <ArrowLeftRight className="w-5 h-5 text-white/60" />
        <h3 className="text-white">Side-by-Side Comparison</h3>
      </div>

      {/* Visual Comparison */}
      <div className="grid grid-cols-2 gap-8 p-8 bg-white/5 rounded-lg border border-white/10">
        <div className="space-y-3 flex flex-col items-center">
          <GlassTile parameters={tileA} size="large" />
          <div className="text-center">
            <div className="text-white">{tileA.name}</div>
            <div className="text-white/50 text-sm">Current</div>
          </div>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <GlassTile parameters={tileB} size="large" />
          <div className="text-center">
            <div className="text-white">{tileB.name}</div>
            <div className="text-white/50 text-sm">Comparing</div>
          </div>
        </div>
      </div>

      {/* Parameter Differences */}
      <div className="space-y-2">
        <h4 className="text-white/70 text-sm mb-3">Parameter Differences</h4>
        <div className="space-y-2">
          {parameters.map(({ key, label, unit }) => {
            const comparison = compareParameter(key);
            
            return (
              <div
                key={key}
                className={`
                  flex items-center justify-between p-3 rounded-lg
                  ${comparison.isDifferent 
                    ? 'bg-white/10 border border-white/20' 
                    : 'bg-white/5 border border-white/5'
                  }
                `}
              >
                <span className="text-white/70 text-sm">{label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-white/90 text-sm">
                    {comparison.valueA}{unit}
                  </span>
                  {comparison.isDifferent && (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-white/40" />
                      <span className="text-white/90 text-sm">
                        {comparison.valueB}{unit}
                      </span>
                      <span className={`
                        text-xs px-2 py-1 rounded
                        ${comparison.diff > 0 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                        }
                      `}>
                        {comparison.diff > 0 ? '+' : ''}{comparison.diff}{unit}
                      </span>
                    </div>
                  )}
                  {!comparison.isDifferent && (
                    <span className="text-white/40 text-xs">No change</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Color Comparison */}
      <div className="space-y-2">
        <h4 className="text-white/70 text-sm mb-3">Colors</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-white/60 text-sm">Accent Color</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-white/20"
                style={{ backgroundColor: tileA.accentColor }}
              />
              <span className="text-white/80 text-sm">{tileA.accentColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-white/60 text-sm">Accent Color</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-white/20"
                style={{ backgroundColor: tileB.accentColor }}
              />
              <span className="text-white/80 text-sm">{tileB.accentColor}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
