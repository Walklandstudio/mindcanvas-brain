/**
 * Button — primary / ghost variants, brand-aligned
 */
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'mc-btn',
        variant === 'primary' ? 'mc-btn--primary' : 'mc-btn--ghost',
        size === 'sm' ? 'text-sm px-3 py-2' : 'text-base px-4 py-2.5',
        className
      )}
    />
  );
}
