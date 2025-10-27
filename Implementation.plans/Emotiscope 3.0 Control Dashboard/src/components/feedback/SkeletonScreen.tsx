interface SkeletonScreenProps {
  lines?: number;
  className?: string;
}

export function SkeletonScreen({ lines = 3, className = '' }: SkeletonScreenProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="h-6 w-1/3 glass rounded-lg animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="h-4 glass rounded-lg animate-pulse"
          style={{
            width: `${Math.random() * 30 + 70}%`,
            animationDelay: `${i * 150}ms`,
            animationDuration: '1.5s'
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass p-6 rounded-xl space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full glass animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 glass rounded animate-pulse" />
          <div className="h-3 w-1/2 glass rounded animate-pulse" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 glass rounded animate-pulse" style={{ animationDelay: '300ms' }} />
        <div className="h-3 w-5/6 glass rounded animate-pulse" style={{ animationDelay: '450ms' }} />
      </div>
    </div>
  );
}
