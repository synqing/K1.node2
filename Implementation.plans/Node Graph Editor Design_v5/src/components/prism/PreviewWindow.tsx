import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface PreviewWindowProps {
  title?: string;
  fps?: number;
  resolution?: string;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
}

export const PreviewWindow: React.FC<PreviewWindowProps> = ({
  title = 'LED Preview',
  fps = 120,
  resolution = '144 × 1',
  isPlaying = true,
  onTogglePlay,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 288;
    canvas.height = 40;

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.02;

      // Create LED strip simulation
      const ledCount = 144;
      const ledWidth = canvas.width / ledCount;

      for (let i = 0; i < ledCount; i++) {
        const x = i * ledWidth;
        const normalizedPos = i / ledCount;

        // Create wave pattern with multiple frequencies
        const wave1 = Math.sin(normalizedPos * Math.PI * 4 + time) * 0.5 + 0.5;
        const wave2 = Math.sin(normalizedPos * Math.PI * 2 - time * 0.7) * 0.5 + 0.5;
        const wave3 = Math.sin(normalizedPos * Math.PI * 8 + time * 1.5) * 0.5 + 0.5;

        // Combine waves
        const intensity = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);

        // Color cycling
        const hue = (normalizedPos * 360 + time * 50) % 360;
        const saturation = 70 + wave2 * 30;
        const lightness = 40 + intensity * 40;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, 0, ledWidth + 1, canvas.height);

        // Add LED glow effect
        if (intensity > 0.6) {
          const glowGradient = ctx.createRadialGradient(
            x + ledWidth / 2,
            canvas.height / 2,
            0,
            x + ledWidth / 2,
            canvas.height / 2,
            ledWidth * 2
          );
          glowGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${(intensity - 0.6) * 0.5})`);
          glowGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(x - ledWidth, 0, ledWidth * 3, canvas.height);
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        width: '360px',
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
      {/* Glass layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 250px 250px at 20% 20%, 
            rgba(255, 255, 255, 0.1) 0%, 
            rgba(255, 255, 255, 0.02) 40%, 
            transparent 60%)`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 200px 200px at 85% 85%, 
            rgba(255, 255, 255, 0.05) 0%, 
            transparent 50%)`,
        }}
      />

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
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div className="font-bebas" style={{ fontSize: '16px', color: '#e6e9ef' }}>
              {title}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-rama" style={{ fontSize: '11px', color: '#b5bdca', opacity: 0.7 }}>
                {resolution}
              </span>
              <span className="font-jetbrains" style={{ fontSize: '11px', color: '#22dd88' }}>
                {fps} fps
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {isPlaying ? (
                <Pause size={16} color="#e6e9ef" />
              ) : (
                <Play size={16} color="#e6e9ef" />
              )}
            </button>
            <button
              onClick={onReset}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <RotateCcw size={16} color="#e6e9ef" />
            </button>
          </div>
        </div>

        {/* Canvas Preview */}
        <div className="p-6">
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: '#1c2130',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{
                imageRendering: 'pixelated',
                height: '40px',
              }}
            />
          </div>

          {/* Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Frame Time', value: '8.33ms', status: 'good' },
              { label: 'CPU', value: '67%', status: 'warning' },
              { label: 'Latency', value: '2.1ms', status: 'good' },
            ].map((metric, index) => (
              <div
                key={index}
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'rgba(28, 33, 48, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  className="font-rama"
                  style={{
                    fontSize: '10px',
                    color: '#b5bdca',
                    opacity: 0.7,
                    marginBottom: '2px',
                  }}
                >
                  {metric.label}
                </div>
                <div
                  className="font-jetbrains"
                  style={{
                    fontSize: '12px',
                    color: metric.status === 'warning' ? '#f59e0b' : '#22dd88',
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
