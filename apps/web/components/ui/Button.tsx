import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  if (variant === "ghost") {
    return (
      <button
        {...props}
        className={`rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40 ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 font-medium shadow
        bg-gradient-to-b from-[var(--brand-blue-light)] to-[var(--brand-blue)]
        hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-light)]/50 ${className}`}
    >
      {children}
    </button>
  );
}
