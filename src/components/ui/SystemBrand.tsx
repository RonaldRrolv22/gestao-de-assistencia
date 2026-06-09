/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Wrench } from "lucide-react";
import { SYSTEM_NAME, SYSTEM_SUBTITLE } from "../../navigation";

interface SystemBrandProps {
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: {
    badge: "w-9 h-9 rounded-xl",
    icon: "h-[18px] w-[18px]",
    title: "text-xs leading-snug",
    subtitle: "text-[10px] leading-tight mt-0.5",
  },
  md: {
    badge: "w-10 h-10 rounded-xl",
    icon: "h-5 w-5",
    title: "text-[13px] leading-snug",
    subtitle: "text-[11px] leading-tight mt-0.5",
  },
};

export default function SystemBrand({ size = "md", className = "" }: SystemBrandProps) {
  const s = SIZES[size];

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div className={`icon-badge-gradient shrink-0 ${s.badge}`} aria-hidden>
        <Wrench className={`${s.icon} text-white`} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex flex-col">
        <p className={`font-semibold text-heading tracking-tight ${s.title}`}>{SYSTEM_NAME}</p>
        <p className={`font-medium text-text-secondary ${s.subtitle}`}>{SYSTEM_SUBTITLE}</p>
      </div>
    </div>
  );
}
