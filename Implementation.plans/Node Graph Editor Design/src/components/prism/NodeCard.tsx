import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Port, DataType } from './Port';

type ComputationalCost = 'light' | 'heavy';

interface Parameter {
  label: string;
  value: string;
}

interface PortConfig {
  type: DataType;
  connected?: boolean;
  alignWith?: number; // Parameter index to align with
}

interface NodeCardProps {
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
}

export const NodeCard: React.FC<NodeCardProps> = ({
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
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-20"
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

      {/* Main glass card */}
      <div
        className="relative rounded-2xl overflow-visible"
        style={{
          backdropFilter: `blur(${blurAmount + stateBlurAdjustment}px)`,
          WebkitBackdropFilter: `blur(${blurAmount + stateBlurAdjustment}px)`,
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
        }}
      >
        {/* Layer 1: Base glass fill */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${baseOpacity})`,
          }}
        />

        {/* Layer 2: Single light source gradient (top-left) */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 200px 200px at 20% 20%, 
              rgba(255, 255, 255, ${lightGradientOpacity}) 0%, 
              rgba(255, 255, 255, 0.03) 40%, 
              transparent 60%)`,
          }}
        />

        {/* Layer 3: Environmental reflection (bottom-right) */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(110, 231, 243, ${envReflectionOpacity}) 0%, 
              transparent 50%)`,
          }}
        />

        {/* Layer 4: State brightness overlay */}
        {stateBrightnessOpacity > 0 && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              backgroundColor: `rgba(255, 255, 255, ${stateBrightnessOpacity})`,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Layer 5: Subtle noise texture */}
        <div
          className="absolute inset-0 rounded-2xl opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-4 flex flex-col gap-2">
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
                    className="font-jetbrains"
                    style={{
                      fontSize: '13px',
                      color: '#e6e9ef',
                      opacity: 0.95,
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
