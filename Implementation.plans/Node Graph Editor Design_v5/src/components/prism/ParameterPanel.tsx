import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Info } from 'lucide-react';

interface Parameter {
  name: string;
  value: string | number;
  type: 'number' | 'select' | 'toggle' | 'color';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

interface ParameterGroup {
  title: string;
  parameters: Parameter[];
  defaultExpanded?: boolean;
}

interface ParameterPanelProps {
  nodeName: string;
  groups: ParameterGroup[];
  onParameterChange?: (groupIndex: number, paramIndex: number, value: any) => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  nodeName,
  groups,
  onParameterChange,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    new Set(groups.map((g, i) => g.defaultExpanded ? i : -1).filter(i => i !== -1))
  );

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        width: '320px',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        backgroundColor: 'rgba(37, 45, 63, 0.7)',
        boxShadow: `
          0 12px 24px rgba(0, 0, 0, 0.25),
          0 32px 64px rgba(0, 0, 0, 0.35),
          inset 0 1px 2px rgba(255, 255, 255, 0.12),
          inset 0 -1px 1px rgba(0, 0, 0, 0.15)
        `,
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      {/* Light source gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 250px 250px at 20% 20%, 
            rgba(255, 255, 255, 0.1) 0%, 
            rgba(255, 255, 255, 0.02) 40%, 
            transparent 60%)`,
        }}
      />

      {/* Secondary spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 200px 200px at 85% 85%, 
            rgba(255, 255, 255, 0.05) 0%, 
            transparent 50%)`,
        }}
      />

      {/* Environmental reflection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
            rgba(110, 231, 243, 0.05) 0%, 
            transparent 50%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div
          className="px-6 py-4"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="font-bebas" style={{ fontSize: '16px', color: '#e6e9ef' }}>
            {nodeName}
          </div>
          <div className="font-rama" style={{ fontSize: '11px', color: '#b5bdca', opacity: 0.7 }}>
            Node Parameters
          </div>
        </div>

        {/* Parameter Groups */}
        <div className="flex flex-col">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupIndex)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span className="font-bebas" style={{ fontSize: '13px', color: '#e6e9ef' }}>
                  {group.title}
                </span>
                <motion.div
                  animate={{ rotate: expandedGroups.has(groupIndex) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} color="#b5bdca" />
                </motion.div>
              </button>

              {/* Group Content */}
              <AnimatePresence>
                {expandedGroups.has(groupIndex) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.68, -0.25, 0.265, 1.15] }}
                    style={{
                      overflow: 'hidden',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div className="px-6 py-4 flex flex-col gap-4">
                      {group.parameters.map((param, paramIndex) => (
                        <div key={paramIndex} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-rama"
                              style={{
                                fontSize: '12px',
                                color: '#b5bdca',
                                opacity: 0.9,
                              }}
                            >
                              {param.name}
                            </span>
                            {param.description && (
                              <div className="group relative">
                                <Info size={12} color="#b5bdca" opacity={0.5} />
                                <div
                                  className="absolute left-0 top-6 w-48 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                                  style={{
                                    backgroundColor: 'rgba(28, 33, 48, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    fontSize: '10px',
                                    color: '#b5bdca',
                                    lineHeight: '1.4',
                                  }}
                                >
                                  {param.description}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Parameter Input */}
                          {param.type === 'number' && (
                            <input
                              type="number"
                              value={param.value}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              onChange={(e) =>
                                onParameterChange?.(groupIndex, paramIndex, parseFloat(e.target.value))
                              }
                              className="font-jetbrains px-3 py-1.5 rounded-lg outline-none transition-all"
                              style={{
                                fontSize: '13px',
                                backgroundColor: 'rgba(28, 33, 48, 0.5)',
                                color: '#e6e9ef',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#ffb84d';
                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 184, 77, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          )}

                          {param.type === 'select' && (
                            <select
                              value={param.value}
                              onChange={(e) =>
                                onParameterChange?.(groupIndex, paramIndex, e.target.value)
                              }
                              className="font-rama px-3 py-1.5 rounded-lg outline-none transition-all cursor-pointer"
                              style={{
                                fontSize: '13px',
                                backgroundColor: 'rgba(28, 33, 48, 0.5)',
                                color: '#e6e9ef',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#ffb84d';
                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 184, 77, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              {param.options?.map((option, i) => (
                                <option key={i} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}

                          {param.type === 'toggle' && (
                            <button
                              onClick={() =>
                                onParameterChange?.(
                                  groupIndex,
                                  paramIndex,
                                  param.value === 'true' ? 'false' : 'true'
                                )
                              }
                              className="flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                backgroundColor: 'rgba(28, 33, 48, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <div
                                className="w-10 h-5 rounded-full relative transition-all"
                                style={{
                                  backgroundColor:
                                    param.value === 'true'
                                      ? 'rgba(255, 184, 77, 0.3)'
                                      : 'rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <motion.div
                                  className="absolute top-0.5 w-4 h-4 rounded-full"
                                  style={{
                                    backgroundColor: param.value === 'true' ? '#ffb84d' : '#7a8194',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                  }}
                                  animate={{
                                    left: param.value === 'true' ? '20px' : '2px',
                                  }}
                                  transition={{ duration: 0.2, ease: [0.68, -0.25, 0.265, 1.15] }}
                                />
                              </div>
                              <span
                                className="font-jetbrains"
                                style={{
                                  fontSize: '12px',
                                  color: param.value === 'true' ? '#ffb84d' : '#7a8194',
                                }}
                              >
                                {param.value === 'true' ? 'ON' : 'OFF'}
                              </span>
                            </button>
                          )}

                          {param.type === 'color' && (
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={param.value as string}
                                onChange={(e) =>
                                  onParameterChange?.(groupIndex, paramIndex, e.target.value)
                                }
                                className="w-12 h-8 rounded-lg cursor-pointer"
                                style={{
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                              />
                              <span
                                className="font-jetbrains"
                                style={{
                                  fontSize: '12px',
                                  color: '#e6e9ef',
                                  opacity: 0.9,
                                }}
                              >
                                {param.value}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
