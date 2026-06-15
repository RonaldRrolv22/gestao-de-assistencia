/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import BrandLogo from "./ui/BrandLogo";
import NotificationCenter from "./NotificationCenter";
import { AppNotification, User } from "../types";

interface AppTopBarProps {
  currentUser: User;
  notifications: AppNotification[];
  onNavigateToRequest?: (requestId: string) => void;
}

export default function AppTopBar({
  currentUser,
  notifications,
  onNavigateToRequest,
}: AppTopBarProps) {
  const firstName = currentUser.name.trim().split(/\s+/)[0] || currentUser.name;

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
        <div className="ml-auto shrink-0">
          <NotificationCenter
            notifications={notifications}
            currentUserId={currentUser.id}
            onNavigateToRequest={onNavigateToRequest}
            compact
          />
        </div>
      </div>
    </header>
  );
}
