/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: "default" | "premium" | "compact" | "page";
  compact?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  children,
  variant = "default",
  compact = false,
}: PageHeaderProps) {
  const resolvedVariant = variant === "default" && compact ? "compact" : variant;
  const isPremium = resolvedVariant === "premium";
  const isPage = resolvedVariant === "page";
  const isCompact = resolvedVariant === "compact";

  if (isPage) {
    return (
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1 pb-4 border-b border-slate-200/80">
        <div className="min-w-0">
          <h2 className="text-lg lg:text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {children && (
          <div className="w-full lg:flex-1 lg:min-w-[min(100%,28rem)] lg:max-w-3xl flex justify-start lg:justify-end">
            {children}
          </div>
        )}
      </header>
    );
  }

  return (
    <div
      className={`flex flex-col ${
        isCompact ? "gap-2 lg:flex-row lg:items-center lg:justify-between" : "gap-5"
      } ${
        isPremium && !isCompact
          ? "lg:flex-row lg:items-start lg:justify-between"
          : !isCompact
            ? "md:flex-row md:items-center justify-between pb-4 border-b border-border"
            : ""
      }`}
    >
      <div className="min-w-0">
        <h2
          className={`font-bold text-heading tracking-tight ${
            isCompact
              ? "text-lg lg:text-xl"
              : isPremium
                ? "text-xl sm:text-2xl lg:text-[1.65rem]"
                : "text-xl"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`max-w-xl ${
              isCompact
                ? "text-xs text-text-secondary/70 mt-0.5 leading-snug"
                : isPremium
                  ? "mt-1.5 text-sm text-text-secondary/75 leading-relaxed"
                  : "mt-1.5 text-xs text-text-secondary"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="w-full lg:w-auto shrink-0">{children}</div>}
    </div>
  );
}
