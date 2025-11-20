/**
 * Button Component
 * Dieter Rams-inspired: Minimal, functional, precise
 * "Less but better" - only essential visual elements
 */

import React from 'react';

export interface ButtonProps {
  /** Button content */
  children: React.ReactNode;

  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Disabled state */
  disabled?: boolean;

  /** Full width */
  fullWidth?: boolean;

  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';

  /** Additional CSS classes (web only) */
  className?: string;

  /** Loading state */
  loading?: boolean;

  /** Icon before text */
  iconBefore?: React.ReactNode;

  /** Icon after text */
  iconAfter?: React.ReactNode;
}

/**
 * Button component following Dieter Rams design principles
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  loading = false,
  iconBefore,
  iconAfter,
}) => {
  // Base styles: minimal, functional, precise
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium tracking-wide
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
    select-none
  `.trim();

  // Variant styles: functional color coding
  const variantStyles = {
    // Primary: Sonic green (active/play state)
    primary: `
      bg-sonic-500 text-graphite-950
      hover:bg-sonic-400 hover:shadow-glow-sonic
      active:bg-sonic-600 active:scale-[0.98]
      focus:ring-sonic-400
      font-semibold
    `,
    // Secondary: Amber accent (creative actions)
    secondary: `
      bg-accent-500 text-graphite-950
      hover:bg-accent-400 hover:shadow-glow-amber
      active:bg-accent-600 active:scale-[0.98]
      focus:ring-accent-400
      font-semibold
    `,
    // Outline: Subtle, functional (secondary actions)
    outline: `
      bg-transparent border border-border-primary text-text-primary
      hover:bg-surface-primary hover:border-border-secondary
      active:bg-surface-secondary active:scale-[0.98]
      focus:ring-primary-500
    `,
    // Ghost: Minimal (tertiary actions)
    ghost: `
      bg-transparent text-text-secondary
      hover:bg-surface-subtle hover:text-text-primary
      active:bg-surface-primary active:scale-[0.98]
      focus:ring-graphite-600
    `,
    // Danger: Error state (destructive actions)
    danger: `
      bg-error-DEFAULT text-white
      hover:bg-error-light hover:shadow-md
      active:bg-error-dark active:scale-[0.98]
      focus:ring-error-light
      font-semibold
    `,
  };

  // Size styles: precise, systematic
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm rounded-md min-w-16',
    md: 'h-10 px-4 text-base rounded-lg min-w-20',
    lg: 'h-12 px-6 text-lg rounded-lg min-w-24',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  const allStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyle}
    ${className}
  `
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={allStyles}
      aria-busy={loading}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && iconBefore && <span className="inline-flex">{iconBefore}</span>}
      <span className="inline-flex items-center">{children}</span>
      {!loading && iconAfter && <span className="inline-flex">{iconAfter}</span>}
    </button>
  );
};

export default Button;
