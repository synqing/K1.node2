import React, { useState } from 'react';

export interface K1CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function K1Card({
  children,
  elevated = false,
  interactive = false,
  selected = false,
  onClick,
  className = '',
  style = {},
}: K1CardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isClickable = interactive || !!onClick;

  const getBackground = () => {
    if (selected || (interactive && isHovered)) {
      return 'var(--k1-surface-raised)';
    }
    if (elevated) {
      return 'var(--k1-surface-raised)';
    }
    return 'var(--k1-surface)';
  };

  const getBorder = () => {
    if (selected) {
      return '2px solid var(--k1-accent)';
    }
    if (interactive && isHovered) {
      return '1px solid var(--k1-accent)';
    }
    return '1px solid var(--k1-border)';
  };

  const getShadow = () => {
    const shadows = [];

    // Base elevation shadow
    if (selected || (interactive && isHovered)) {
      shadows.push('var(--elevation-2)');
    } else if (elevated) {
      shadows.push('var(--elevation-2)');
    } else {
      shadows.push('var(--elevation-1)');
    }

    // Glow for selected/hover
    if (selected || (interactive && isHovered)) {
      shadows.push('var(--glow-accent)');
    }

    return shadows.join(', ');
  };

  const getScale = () => {
    if (isPressed && isClickable) {
      return 0.98;
    }
    if (interactive && isHovered && !selected) {
      return 1.02;
    }
    return 1.0;
  };

  const handleClick = () => {
    if (onClick && !isPressed) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component
      onClick={handleClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => isClickable && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable && Component === 'div' ? 'button' : undefined}
      aria-pressed={isClickable && selected ? true : undefined}
      className={`k1-card ${className}`}
      style={{
        background: getBackground(),
        border: getBorder(),
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
        boxShadow: getShadow(),
        transform: `scale(${getScale()})`,
        transition: `all var(--duration-fast) var(--ease-out)`,
        cursor: isClickable ? 'pointer' : 'default',
        outline: 'none',
        width: '100%',
        textAlign: isClickable ? 'left' : undefined,
        ...style,
      }}
    >
      {children}

      <style jsx>{`
        .k1-card:focus-visible {
          outline: 2px solid var(--k1-accent);
          outline-offset: 2px;
          box-shadow: var(--glow-accent);
        }
      `}</style>
    </Component>
  );
}
