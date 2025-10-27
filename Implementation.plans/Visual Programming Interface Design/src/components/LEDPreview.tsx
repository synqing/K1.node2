import React, { useEffect, useRef } from 'react';

export const LEDPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrame: number;
    let time = 0;
    
    const animate = () => {
      time += 0.016; // ~60fps
      
      const width = canvas.width;
      const height = canvas.height;
      
      // Base dark background
      ctx.fillStyle = '#1C2130';
      ctx.fillRect(0, 0, width, height);
      
      // Create vibrant LED visualization with cyans, purples, magentas
      const gradient1 = ctx.createRadialGradient(
        width * 0.3,
        height * 0.35,
        0,
        width * 0.3,
        height * 0.35,
        width * 0.55
      );
      
      const hue1 = (time * 15 + 180) % 360; // Cyan/blue range
      const hue2 = (time * 15 + 280) % 360; // Magenta range
      const hue3 = (time * 15 + 30) % 360;  // Orange range
      
      gradient1.addColorStop(0, `hsla(${hue1}, 85%, 65%, 0.7)`);
      gradient1.addColorStop(0.4, `hsla(${hue2}, 75%, 55%, 0.5)`);
      gradient1.addColorStop(0.7, `hsla(${hue3}, 80%, 50%, 0.3)`);
      gradient1.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);
      
      // Add secondary gradient for depth and complexity
      const gradient2 = ctx.createRadialGradient(
        width * 0.65,
        height * 0.55,
        0,
        width * 0.65,
        height * 0.55,
        width * 0.45
      );
      
      gradient2.addColorStop(0, `hsla(${hue2 + 40}, 80%, 60%, 0.6)`);
      gradient2.addColorStop(0.5, `hsla(${hue3 + 40}, 70%, 50%, 0.4)`);
      gradient2.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);
      
      // Add subtle pulsing center
      const pulseScale = 0.8 + Math.sin(time * 2) * 0.2;
      const gradient3 = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        width * 0.25 * pulseScale
      );
      
      gradient3.addColorStop(0, `hsla(${hue1 + 20}, 90%, 70%, ${0.4 * pulseScale})`);
      gradient3.addColorStop(0.6, `hsla(${hue2 + 20}, 80%, 60%, ${0.2 * pulseScale})`);
      gradient3.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, width, height);
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={700}
      className="led-preview"
    />
  );
};
