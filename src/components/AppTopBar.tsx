/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import BrandLogo from "./ui/BrandLogo";

interface AppTopBarProps {
  currentUserName: string;
}

export default function AppTopBar({ currentUserName }: AppTopBarProps) {
  const firstName = currentUserName.trim().split(/\s+/)[0] || currentUserName;

  return (
    <header className="shrink-0 bg-card/95 backdrop-blur-md border-b border-border/60">
      <div className="flex items-center gap-4 px-6 lg:px-8 py-3 min-w-0">
        <BrandLogo size="header" showText={false} flush />
        <div className="min-w-0 pl-4 border-l border-slate-200/90">
          <p className="text-xs text-slate-600">Bem vindo(a).</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5 truncate">
            Olá, {firstName}.
          </p>
        </div>
      </div>
    </header>
  );
}
