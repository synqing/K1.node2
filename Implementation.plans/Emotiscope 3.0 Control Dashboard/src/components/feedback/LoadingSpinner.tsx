import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} text-[var(--k1-accent)] animate-spin`}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(110, 231, 243, 0.5))'
        }}
      />
    </div>
  );
}
