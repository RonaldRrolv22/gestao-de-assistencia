/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "header";
  showText?: boolean;
  /** Remove padding/gap do wrapper — alinha à esquerda com textos abaixo */
  flush?: boolean;
  className?: string;
}

const SIZES = {
  sm: { img: "h-7 max-h-7 max-w-[120px]", title: "text-xs", subtitle: "text-[10px]" },
  md: { img: "h-8 max-h-8 max-w-[140px]", title: "text-sm", subtitle: "text-[11px]" },
  lg: { img: "h-11 max-h-11 max-w-[180px]", title: "text-base", subtitle: "text-xs" },
  header: { img: "h-14 max-h-14 max-w-[300px]", title: "text-base", subtitle: "text-xs" },
};

export default function BrandLogo({
  size = "md",
  showText = true,
  flush = false,
  className = "",
}: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <div
      className={`flex items-center min-w-0 ${flush ? "gap-0" : "gap-3"} ${className}`}
    >
      <img
        src="/logo.png"
        alt="Neurobots"
        className={`${s.img} w-auto block object-contain object-left shrink-0`}
        style={{ objectPosition: "left center" }}
      />
      {showText && (
        <div className="min-w-0">
          <p className={`font-semibold leading-tight text-heading truncate ${s.title}`}>
            Controle de Manutenção
          </p>
          <p className={`text-text-secondary truncate ${s.subtitle}`}>
            SYS-TECH
          </p>
        </div>
      )}
    </div>
  );
}
