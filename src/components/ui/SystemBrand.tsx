/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AXON_ICON_SRC } from "../../navigation";

interface SystemBrandProps {
  variant?: "topbar" | "sidebar";
  className?: string;
}

export default function SystemBrand({ variant = "topbar", className = "" }: SystemBrandProps) {
  if (variant === "sidebar") {
    return (
      <div className={`flex items-center justify-center w-full px-4 py-5 border-b border-border/80 ${className}`}>
        <img
          src={AXON_ICON_SRC}
          alt="Axon"
          className="h-14 max-w-[200px] w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center h-full w-full px-4 ${className}`}>
      <img
        src={AXON_ICON_SRC}
        alt="Axon"
        className="h-14 max-w-[220px] w-auto object-contain"
      />
    </div>
  );
}
