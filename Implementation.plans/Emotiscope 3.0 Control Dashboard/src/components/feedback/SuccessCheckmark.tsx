import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
  duration?: number;
}

export function SuccessCheckmark({ size = 'md', onComplete, duration = 2000 }: SuccessCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300`}
      style={{
        background: 'rgba(52, 211, 153, 0.2)',
        border: '2px solid var(--k1-success)',
        boxShadow: '0 0 20px rgba(52, 211, 153, 0.4)',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      <Check 
        className={`${iconSizes[size]} text-[var(--k1-success)]`}
        style={{
          animation: 'drawCheck 0.4s ease-out 0.1s'
        }}
      />
    </div>
  );
}
