import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

interface NodeCardAdvancedProps {
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
  // Advanced features
  metrics?: MetricData[];
  showMetricsTab?: boolean;
  processingState?: 'idle' | 'processing' | 'compiled';
  cpuLoad?: number; // 0-100
}

export const NodeCardAdvanced: React.FC<NodeCardAdvancedProps> = ({
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
  showMetricsTab = false,
  processingState = 'idle',
  cpuLoad = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showParameters, setShowParameters] = useState(true);

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

  // Status LED color based on state
  const statusLEDColor = hasError
    ? '#ef4444'
    : processingState === 'processing'
    ? '#ffb84d'
    : processingState === 'compiled'
    ? '#22dd88'
    : '#6ee7f3';

  // Edge lighting intensity based on processing state
  const edgeLightIntensity = processingState === 'processing' ? 0.4 : processingState === 'idle' ? 0.15 : 0;

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

        {/* Layer 2.5: Secondary spotlight (bottom-right) - inspired by img1 */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 180px 180px at 85% 85%, 
              rgba(255, 255, 255, ${lightGradientOpacity * 0.5}) 0%, 
              rgba(255, 255, 255, 0.02) 35%, 
              transparent 50%)`,
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

        {/* Layer 5: Edge lighting (electrified effect) */}
        <AnimatePresence>
          {edgeLightIntensity > 0 && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [edgeLightIntensity, edgeLightIntensity * 1.5, edgeLightIntensity],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                boxShadow: `inset 0 0 20px rgba(255, 184, 77, ${edgeLightIntensity}), 
                            inset 0 0 40px rgba(255, 184, 77, ${edgeLightIntensity * 0.5})`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Layer 6: Subtle noise texture */}
        <div
          className="absolute inset-0 rounded-2xl opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Status LED Strip (left edge) - inspired by img2 concept */}
        <motion.div
          className="absolute left-0 top-8 w-1 rounded-r-full"
          style={{
            height: '32px',
            backgroundColor: statusLEDColor,
            boxShadow: `0 0 12px ${statusLEDColor}, 0 0 24px ${statusLEDColor}40`,
            transform: 'skewY(-8deg)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* CPU Load indicator (bottom edge, angled) */}
        {cpuLoad > 0 && (
          <div
            className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'skewX(-4deg)',
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: cpuLoad > 80 ? '#ef4444' : cpuLoad > 50 ? '#f59e0b' : '#22dd88',
                boxShadow: `0 0 8px ${cpuLoad > 80 ? '#ef4444' : cpuLoad > 50 ? '#f59e0b' : '#22dd88'}`,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${cpuLoad}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Cutaway Metrics Tab - inspired by img2's K1-Lightwave design */}
        <AnimatePresence>
          {showMetricsTab && metrics.length > 0 && (
            <motion.div
              className="absolute -top-3 right-12 rounded-lg overflow-hidden z-10"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.68, -0.25, 0.265, 1.15] }}
              style={{
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                backgroundColor: 'rgba(47, 56, 73, 0.85)',
                boxShadow: `
                  0 8px 16px rgba(0, 0, 0, 0.3),
                  0 16px 32px rgba(0, 0, 0, 0.4),
                  inset 0 1px 1px rgba(255, 255, 255, 0.1)
                `,
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Cutaway tab glass layers */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse 80px 80px at 20% 20%, 
                    rgba(255, 255, 255, 0.1) 0%, 
                    transparent 50%)`,
                }}
              />
              
              <div className="relative z-10 px-3 py-2 flex flex-col gap-1">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-baseline gap-2">
                    <span
                      className="font-rama"
                      style={{
                        fontSize: '10px',
                        color: '#b5bdca',
                        opacity: 0.7,
                      }}
                    >
                      {metric.label}:
                    </span>
                    <span
                      className="font-jetbrains"
                      style={{
                        fontSize: '11px',
                        color: metric.status === 'critical' 
                          ? '#ef4444' 
                          : metric.status === 'warning'
                          ? '#f59e0b'
                          : '#e6e9ef',
                        fontWeight: '500',
                      }}
                    >
                      {metric.value}
                      {metric.unit && (
                        <span style={{ opacity: 0.6, marginLeft: '2px' }}>
                          {metric.unit}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

          {/* Parameters Section with Progressive Disclosure */}
          <AnimatePresence>
            {showParameters && parameters.length > 0 && (
              <motion.div
                className="flex flex-col gap-2"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.68, -0.25, 0.265, 1.15] }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>

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
