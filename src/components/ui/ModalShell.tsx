/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X } from "lucide-react";

interface ModalShellProps {
  children: React.ReactNode;
  onClose?: () => void;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  zIndex?: string;
}

const MAX_WIDTH: Record<NonNullable<ModalShellProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

export default function ModalShell({
  children,
  onClose,
  maxWidth = "4xl",
  className = "",
  zIndex = "z-50",
}: ModalShellProps) {
  return (
    <div
      className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 ${zIndex} no-print animate-fade-in`}
    >
      <div
        className={`bg-card rounded-2xl w-full ${MAX_WIDTH[maxWidth]} shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden animate-slide-up ${className}`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/90 border border-border text-text-secondary hover:text-text-primary hover:bg-white transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
