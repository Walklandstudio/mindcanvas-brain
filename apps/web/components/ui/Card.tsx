/**
 * Card — neutral, brand-aligned container
 */
import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={clsx('mc-card', className)} {...props} />;
}
