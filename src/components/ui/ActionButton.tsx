/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "accent" | "success" | "danger" | "neutral";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white border border-transparent shadow-sm font-semibold btn-premium-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30",
  secondary:
    "bg-card text-text-primary border border-border hover:bg-slate-50 hover:border-slate-200 font-medium btn-premium-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20",
  accent:
    "bg-card text-brand-orange border border-border hover:bg-orange-50 font-medium btn-glow-base btn-premium-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20",
  success:
    "bg-success text-white hover:bg-emerald-700 border border-emerald-600 font-medium btn-glow-base btn-premium-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
  danger:
    "bg-card text-danger border border-red-200 hover:bg-red-50 font-medium btn-glow-base btn-premium-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40",
  neutral:
    "bg-slate-50 text-text-secondary border border-border hover:bg-slate-100 font-medium btn-premium-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/40",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-4 py-2 text-xs rounded-xl gap-2",
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ActionButton({
  variant = "neutral",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`group inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : (
        icon && <span className="icon-plus-animate shrink-0 flex items-center">{icon}</span>
      )}
      {children}
    </button>
  );
}
