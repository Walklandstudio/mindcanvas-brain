/**
 * UI Button Component
 * --------------------------------------------------------
 * Branded button variants: primary and ghost.
 */

import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'mc-btn font-medium transition-transform duration-100 active:scale-[0.99]',
        {
          'mc-btn-primary text-white': variant === 'primary',
          'mc-btn-ghost text-white/90': variant === 'ghost',
          'text-sm px-3 py-2': size === 'sm',
          'text-base px-4 py-2.5': size === 'md',
        },
        className
      )}
    >
      {children}
    </button>
  );
}
