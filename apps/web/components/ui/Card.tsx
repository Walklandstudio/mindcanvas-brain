/**
 * Card — neutral, brand-aligned container + simple wrappers
 */
import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type DivProps = HTMLAttributes<HTMLDivElement>;
type HProps = HTMLAttributes<HTMLHeadingElement>;

export function Card({
  className,
  ...props
}: DivProps & { children: ReactNode }) {
  return <div className={clsx("mc-card", className)} {...props} />;
}

/** Optional header area (padding, border handled by CSS .mc-card-header) */
export function CardHeader({ className, ...props }: DivProps) {
  return <div className={clsx("mc-card-header", className)} {...props} />;
}

/** Title styling (size/weight handled by CSS .mc-card-title) */
export function CardTitle({ className, ...props }: HProps) {
  return <h3 className={clsx("mc-card-title", className)} {...props} />;
}

/** Content area (spacing handled by CSS .mc-card-content) */
export function CardContent({ className, ...props }: DivProps) {
  return <div className={clsx("mc-card-content", className)} {...props} />;
}

/** Optional footer if you need it later */
export function CardFooter({ className, ...props }: DivProps) {
  return <div className={clsx("mc-card-footer", className)} {...props} />;
}

export default Card;
