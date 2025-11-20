/**
 * Card Component
 * Dieter Rams-inspired: Clean containers with functional hierarchy
 * "Good design is unobtrusive" - cards organize without dominating
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
 * Card component following Rams principles: functional, unobtrusive, precise
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
  // Base styles: minimal, functional
  const baseStyles = `
    rounded-lg
    transition-all duration-200
  `.trim();

  // Variant styles: functional depth hierarchy
  const variantStyles = {
    // Default: standard card surface
    default: `
      bg-surface-primary border border-border-subtle
    `,
    // Elevated: prominent cards (active/focused)
    elevated: `
      bg-surface-primary border border-border-primary shadow-lg
      hover:shadow-xl
    `,
    // Bordered: emphasized boundary
    bordered: `
      bg-surface-subtle border border-border-primary
    `,
    // Ghost: minimal, content-first
    ghost: `
      bg-transparent
    `,
  };

  // Padding styles: systematic spacing
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  // Interactive styles: subtle, functional feedback
  const interactiveStyles = onClick
    ? 'cursor-pointer hover:border-border-secondary hover:bg-surface-secondary active:scale-[0.99]'
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
    <div
      className={allStyles}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {(title || subtitle || headerActions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-tertiary leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0">{headerActions}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
