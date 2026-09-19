import React from 'react';
import { Link } from 'react-router-dom';


export default function PillButton({
  children,
  variant = 'solid',
  size = 'md',
  rounded = 'figma',
  className = '',
  icon: Icon,
  iconPosition = 'left',
  to,
  href,
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
  const roundedClasses = {
    full: 'rounded-full',
    figma: 'rounded-figma',
    lg: 'rounded-lg',
    md: 'rounded-md',
    sm: 'rounded-sm',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  };

  const hasCustomRounded = className.includes('rounded-');
  const roundedClass = hasCustomRounded ? '' : (roundedClasses[rounded] || 'rounded-figma');

  const baseStyles =
    `inline-flex items-center justify-center font-medium select-none transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${roundedClass}`;

  const sizeStyles = {
    xs: 'px-3 py-1.5 text-xs gap-1',
    sm: 'px-4 py-2 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2.5',
  };

  const variantStyles = {
    solid: 'bg-ink text-white hover:bg-[#202020] active:bg-[#151515] shadow-none',
    ghost:
      'bg-transparent text-ink border border-ink/20 hover:border-ink hover:bg-black/5 active:bg-black/10',
    light:
      'bg-surface text-ink border border-track/60 hover:border-muted hover:bg-white active:bg-surface',
    danger:
      'bg-transparent text-red-600 border border-red-200 hover:bg-red-50 active:bg-red-100',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
    variantStyles[variant] || variantStyles.solid
  } ${className}`;

  const content = (
    <>
      {Icon && iconPosition === 'left' && (
        <Icon className={size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && (
        <Icon className={size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {content}
    </button>
  );
}
