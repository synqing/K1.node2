import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Port, DataType } from './Port';

type ComputationalCost = 'light' | 'heavy';

interface Parameter {
  label: string;
  value: string;
  editable?: boolean;
}

interface PortConfig {
  type: DataType;
  connected?: boolean;
  alignWith?: number;
}

interface MetricData {
  label: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
}

interface NodeCardCutawayProps {
  title: string;
  description: string;
  parameters?: Parameter[];
  inputPorts?: PortConfig[];
  outputPorts?: PortConfig[];
  cost?: ComputationalCost;
  selected?: boolean;
  hasError?: boolean;
  errorCount?: number;
  style?: React.CSSProperties;
  metrics?: MetricData[];
  showMetricsTab?: boolean;
  tabLabel?: string;
}

export const NodeCardCutaway: React.FC<NodeCardCutawayProps> = ({
  title,
  description,
  parameters = [],
  inputPorts = [],
  outputPorts = [],
  cost = 'light',
  selected = false,
  hasError = false,
  errorCount = 0,
  style,
  metrics = [],
  showMetricsTab = true,
  tabLabel,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Computational cost determines glass thickness
  const blurAmount = cost === 'light' ? 20 : 40;
  const baseOpacity = cost === 'light' ? 0.06 : 0.1;
  const lightGradientOpacity = cost === 'light' ? 0.12 : 0.14;
  const envReflectionOpacity = cost === 'light' ? 0.04 : 0.06;
  const shadowOpacity1 = cost === 'light' ? 0.18 : 0.32;
  const shadowOpacity2 = cost === 'light' ? 0.27 : 0.48;

  // State-based adjustments
  const stateBlurAdjustment = isHovered ? 4 : selected ? 8 : 0;
  const stateBrightnessOpacity = isHovered ? 0.05 : selected ? 0.08 : 0;
  const stateShadowOffset = isHovered ? 2 : selected ? 4 : 0;

  // Cutaway dimensions
  const cutawayWidth = 100;
  const cutawayHeight = 48;
  const cutawayRadius = 12;

  return (
    <motion.div
      className="relative"
      style={{
        width: '280px',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={false}
      animate={{
        scale: isHovered ? 1.01 : 1,
      }}
      transition={{
        duration: isHovered ? 0.12 : 0.28,
        ease: isHovered ? [0.5, 0, 0.5, 1] : [0.68, -0.25, 0.265, 1.15],
      }}
    >
      {/* Error Badge */}
      {hasError && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-30"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '600',
          }}
          animate={{
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {errorCount}
        </motion.div>
      )}

      {/* Cutaway Tab Element (top-right) */}
      {showMetricsTab && (
        <div
          className="absolute z-20"
          style={{
            top: '-8px',
            right: '16px',
            width: `${cutawayWidth}px`,
            height: `${cutawayHeight}px`,
            borderRadius: `${cutawayRadius}px`,
            backdropFilter: `blur(${blurAmount + stateBlurAdjustment}px) saturate(1.1)`,
            WebkitBackdropFilter: `blur(${blurAmount + stateBlurAdjustment}px) saturate(1.1)`,
            boxShadow: `
              0 ${8 + stateShadowOffset}px ${16}px rgba(0, 0, 0, ${shadowOpacity1 * 0.8}),
              0 ${20 + stateShadowOffset}px ${40}px rgba(0, 0, 0, ${shadowOpacity2 * 0.8}),
              inset 0 1px 2px rgba(255, 255, 255, 0.15),
              inset 0 -1px 1px rgba(0, 0, 0, 0.1)
            `,
            border: selected
              ? '1px solid rgba(255, 184, 77, 0.8)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Tab base fill */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(255, 255, 255, ${baseOpacity})`,
            }}
          />

          {/* Tab light source gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80px 80px at 20% 20%, 
                rgba(255, 255, 255, ${lightGradientOpacity}) 0%, 
                rgba(255, 255, 255, 0.03) 40%, 
                transparent 60%)`,
            }}
          />

          {/* Tab secondary spotlight */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 60px 60px at 85% 85%, 
                rgba(255, 255, 255, ${lightGradientOpacity * 0.5}) 0%, 
                rgba(255, 255, 255, 0.02) 35%, 
                transparent 50%)`,
            }}
          />

          {/* Tab environmental reflection */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 60px 60px at 85% 85%, 
                rgba(110, 231, 243, ${envReflectionOpacity}) 0%, 
                transparent 50%)`,
            }}
          />

          {/* Tab content */}
          <div className="relative z-10 h-full flex items-center justify-center px-3">
            {tabLabel ? (
              <span
                className="font-bebas"
                style={{
                  fontSize: '11px',
                  color: '#e6e9ef',
                  letterSpacing: '0.02em',
                }}
              >
                {tabLabel}
              </span>
            ) : metrics.length > 0 ? (
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="font-jetbrains"
                  style={{
                    fontSize: '13px',
                    color: metrics[0].status === 'critical' 
                      ? '#ef4444' 
                      : metrics[0].status === 'warning'
                      ? '#f59e0b'
                      : '#22dd88',
                    fontWeight: '600',
                  }}
                >
                  {metrics[0].value}
                  {metrics[0].unit && (
                    <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '1px' }}>
                      {metrics[0].unit}
                    </span>
                  )}
                </span>
                <span
                  className="font-rama"
                  style={{
                    fontSize: '8px',
                    color: '#b5bdca',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {metrics[0].label}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Main card with cutaway */}
      <div
        className="relative overflow-visible"
        style={{
          backdropFilter: `blur(${blurAmount + stateBlurAdjustment}px) saturate(1.1)`,
          WebkitBackdropFilter: `blur(${blurAmount + stateBlurAdjustment}px) saturate(1.1)`,
          boxShadow: `
            0 ${12 + stateShadowOffset}px ${24}px rgba(0, 0, 0, ${shadowOpacity1}),
            0 ${32 + stateShadowOffset}px ${64}px rgba(0, 0, 0, ${shadowOpacity2}),
            inset 0 1px 2px rgba(255, 255, 255, 0.15),
            inset 0 -1px 1px rgba(0, 0, 0, 0.1)
          `,
          border: selected
            ? '1px solid #ffb84d'
            : hasError
            ? '2px solid #ef4444'
            : '1px solid rgba(255, 255, 255, 0.2)',
          // CRITICAL: Create the cutaway shape using clip-path
          clipPath: showMetricsTab
            ? `path('
                M 16 0 
                L ${280 - cutawayWidth - 24} 0 
                L ${280 - cutawayWidth - 24} ${cutawayHeight - 16}
                Q ${280 - cutawayWidth - 24} ${cutawayHeight - 8} ${280 - cutawayWidth - 16} ${cutawayHeight - 8}
                L ${280 - 24} ${cutawayHeight - 8}
                Q ${280 - 16} ${cutawayHeight - 8} ${280 - 16} ${cutawayHeight}
                L ${280 - 16} 16
                Q ${280 - 16} 8 ${280 - 8} 8
                L ${280} 8
                L ${280} ${280}
                Q ${280} ${280 + 8} ${280 - 8} ${280 + 8}
                L 16 ${280 + 8}
                Q 8 ${280 + 8} 8 ${280}
                L 8 16
                Q 8 8 16 8
                Z
              ')`
            : 'none',
          borderRadius: '16px',
        }}
      >
        {/* Layer 1: Base glass fill */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${baseOpacity})`,
            borderRadius: '16px',
          }}
        />

        {/* Layer 2: Single light source gradient (top-left) */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 200px 200px at 20% 20%, 
              rgba(255, 255, 255, ${lightGradientOpacity}) 0%, 
              rgba(255, 255, 255, 0.03) 40%, 
              transparent 60%)`,
            borderRadius: '16px',
          }}
        />

        {/* Layer 2.5: Secondary spotlight (bottom-right) */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(255, 255, 255, ${lightGradientOpacity * 0.5}) 0%, 
              rgba(255, 255, 255, 0.02) 35%, 
              transparent 50%)`,
            borderRadius: '16px',
          }}
        />

        {/* Layer 3: Environmental reflection (bottom-right) */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(110, 231, 243, ${envReflectionOpacity}) 0%, 
              transparent 50%)`,
            borderRadius: '16px',
          }}
        />

        {/* Layer 4: State brightness overlay */}
        {stateBrightnessOpacity > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(255, 255, 255, ${stateBrightnessOpacity})`,
              mixBlendMode: 'screen',
              borderRadius: '16px',
            }}
          />
        )}

        {/* Layer 5: Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            borderRadius: '16px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-4 flex flex-col gap-2" style={{ marginTop: showMetricsTab ? `${cutawayHeight - 16}px` : '0' }}>
          {/* Header Section */}
          <div className="flex flex-col gap-1">
            <div className="font-bebas" style={{ fontSize: '14px', color: '#e6e9ef' }}>
              {title}
            </div>
            <div
              className="font-rama"
              style={{
                fontSize: '11px',
                color: '#b5bdca',
                opacity: 0.7,
                lineHeight: '1.4',
              }}
            >
              {description}
            </div>
          </div>

          {/* Divider */}
          {parameters.length > 0 && (
            <div
              style={{
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                marginTop: '4px',
                marginBottom: '4px',
              }}
            />
          )}

          {/* Parameters Section */}
          {parameters.length > 0 && (
            <div className="flex flex-col gap-2">
              {parameters.map((param, index) => (
                <div key={index} className="flex justify-between items-center relative">
                  {/* Input port aligned with parameter */}
                  {inputPorts.find(p => p.alignWith === index) && (
                    <Port
                      type={inputPorts.find(p => p.alignWith === index)!.type}
                      connected={inputPorts.find(p => p.alignWith === index)!.connected}
                      side="input"
                    />
                  )}

                  {/* Output port aligned with parameter */}
                  {outputPorts.find(p => p.alignWith === index) && (
                    <Port
                      type={outputPorts.find(p => p.alignWith === index)!.type}
                      connected={outputPorts.find(p => p.alignWith === index)!.connected}
                      side="output"
                    />
                  )}

                  <span
                    className="font-rama"
                    style={{
                      fontSize: '12px',
                      color: '#b5bdca',
                      opacity: 0.8,
                    }}
                  >
                    {param.label}
                  </span>
                  <span
                    className="font-jetbrains cursor-pointer hover:opacity-100 transition-opacity"
                    style={{
                      fontSize: '13px',
                      color: '#e6e9ef',
                      opacity: 0.95,
                      textDecoration: param.editable ? 'underline' : 'none',
                      textDecorationColor: param.editable ? 'rgba(255, 184, 77, 0.6)' : 'transparent',
                      textDecorationThickness: '1px',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    {param.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Unaligned ports (centered vertically) */}
          {inputPorts.filter(p => p.alignWith === undefined).map((port, index) => (
            <div key={`input-${index}`} className="absolute left-0 top-1/2">
              <Port type={port.type} connected={port.connected} side="input" />
            </div>
          ))}
          {outputPorts.filter(p => p.alignWith === undefined).map((port, index) => (
            <div key={`output-${index}`} className="absolute right-0 top-1/2">
              <Port type={port.type} connected={port.connected} side="output" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
