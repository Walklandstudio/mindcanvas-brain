// apps/web/app/t/[token]/report/PrintButton.tsx
"use client";

import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
};

export default function PrintButton({
  children = "Download PDF",
  className = "",
}: Props) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}
