/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface GradientHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export default function GradientHeader({ children, className = "", actions }: GradientHeaderProps) {
  return (
    <div className={`bg-card px-6 py-5 border-b border-border relative ${className}`}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gradient rounded-r-full" aria-hidden />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="min-w-0 flex-1">{children}</div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
