/**
 * Card component
 * Container component for grouping related content
 */

import React from 'react';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;

  /** Optional title */
  title?: string;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Visual variant */
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost';

  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /** Click handler (makes card interactive) */
  onClick?: () => void;

  /** Additional CSS classes (web only) */
  className?: string;

  /** Header actions (e.g., buttons, icons) */
  headerActions?: React.ReactNode;
}

/**
 * Card component for grouping and organizing content
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'md',
  onClick,
  className = '',
  headerActions,
}) => {
  const baseStyles = `
    rounded-xl
    transition-all duration-200
  `.trim();

  const variantStyles = {
    default: `
      bg-gray-800 border border-gray-700
    `,
    elevated: `
      bg-gray-800 shadow-lg
    `,
    bordered: `
      bg-transparent border-2 border-gray-700
    `,
    ghost: `
      bg-transparent
    `,
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const interactiveStyles = onClick
    ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
    : '';

  const allStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${interactiveStyles}
    ${className}
  `
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return (
    <div className={allStyles} onClick={onClick} role={onClick ? 'button' : undefined}>
      {(title || subtitle || headerActions) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-100">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
          </div>
          {headerActions && <div className="ml-4">{headerActions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
