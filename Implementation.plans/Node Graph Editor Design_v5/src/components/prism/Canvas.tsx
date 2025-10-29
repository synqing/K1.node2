import React, { useEffect, useRef, useState } from 'react';

interface CanvasProps {
  children?: React.ReactNode;
  showGrid?: boolean;
  gridSize?: number;
}

export const Canvas: React.FC<CanvasProps> = ({ children, showGrid = false, gridSize = 40 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Create LED visualization simulation
      // Radial gradient pattern that suggests spectrum analyzer or beat-reactive visualization
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;

      // Background base
      ctx.fillStyle = '#1c2130';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create multiple radial gradients for LED effect
      // Gradient 1: Cyan core
      const gradient1 = ctx.createRadialGradient(
        centerX - 200 * Math.cos(time),
        centerY - 200 * Math.sin(time),
        0,
        centerX - 200 * Math.cos(time),
        centerY - 200 * Math.sin(time),
        400
      );
      gradient1.addColorStop(0, 'rgba(110, 231, 243, 0.4)');
      gradient1.addColorStop(0.5, 'rgba(110, 231, 243, 0.15)');
      gradient1.addColorStop(1, 'rgba(110, 231, 243, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradient 2: Magenta accent
      const gradient2 = ctx.createRadialGradient(
        centerX + 300 * Math.cos(time * 0.7),
        centerY + 300 * Math.sin(time * 0.7),
        0,
        centerX + 300 * Math.cos(time * 0.7),
        centerY + 300 * Math.sin(time * 0.7),
        350
      );
      gradient2.addColorStop(0, 'rgba(244, 114, 182, 0.3)');
      gradient2.addColorStop(0.5, 'rgba(244, 114, 182, 0.1)');
      gradient2.addColorStop(1, 'rgba(244, 114, 182, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradient 3: Orange warmth
      const gradient3 = ctx.createRadialGradient(
        centerX + 150 * Math.sin(time * 1.3),
        centerY - 150 * Math.cos(time * 1.3),
        0,
        centerX + 150 * Math.sin(time * 1.3),
        centerY - 150 * Math.cos(time * 1.3),
        300
      );
      gradient3.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      gradient3.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      gradient3.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle vignette to keep focus on center
      const vignette = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width * 0.7);
      vignette.addColorStop(0, 'rgba(28, 33, 48, 0)');
      vignette.addColorStop(1, 'rgba(28, 33, 48, 0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#1c2130' }}>
      {/* Animated LED visualization canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.7 }}
      />

      {/* Grid overlay - enhanced visibility when dragging */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-200"
        style={{
          backgroundImage: showGrid || isDraggingNode
            ? `
              linear-gradient(to right, rgba(110, 231, 243, ${isDraggingNode ? 0.15 : 0.08}) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(110, 231, 243, ${isDraggingNode ? 0.15 : 0.08}) 1px, transparent 1px)
            `
            : `
              linear-gradient(to right, rgba(34, 39, 51, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 39, 51, 0.03) 1px, transparent 1px)
            `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          opacity: isDraggingNode ? 1 : (showGrid ? 0.8 : 1),
        }}
      />

      {/* Content layer */}
      <div 
        className="relative z-10 w-full h-full"
        onMouseDown={() => setIsDraggingNode(true)}
        onMouseUp={() => setIsDraggingNode(false)}
      >
        {children}
      </div>
    </div>
  );
};
