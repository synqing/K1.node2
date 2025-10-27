import { AlertCircle, Search, Package } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon?: 'alert' | 'search' | 'package' | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon = 'package', 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ''
}: EmptyStateProps) {
  const getIcon = () => {
    if (typeof icon === 'string') {
      const iconMap = {
        alert: AlertCircle,
        search: Search,
        package: Package
      };
      const Icon = iconMap[icon];
      return <Icon className="w-16 h-16 text-[var(--k1-text-dim)] opacity-50" />;
    }
    return icon;
  };

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="mb-4 opacity-60">
        {getIcon()}
      </div>
      <h3 className="text-[var(--k1-text)] mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--k1-text-dim)] text-sm max-w-md mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="min-w-[160px] min-h-[44px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
