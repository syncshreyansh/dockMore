import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function ThemedSelect({
  children,
  className = 'w-full',
  selectClassName = '',
  fullWidth = true,
  ...props
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        {...props}
        className={`${fullWidth ? 'w-full' : 'w-auto'} appearance-none rounded-figma border-0 bg-white px-4 py-2.5 pr-10 text-sm text-ink shadow-none outline-none transition-colors hover:bg-[#F7F7F7] focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-60 ${selectClassName}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
