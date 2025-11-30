import * as React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <div className={`rounded-2xl bg-[var(--panel)] border border-white/10 shadow-glass ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: Props) {
  return <div className={`px-5 pt-5 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: Props) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: Props) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
