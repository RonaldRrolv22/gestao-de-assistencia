/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import NotificationCenter from "./NotificationCenter";
import { useHeaderToolbar } from "../context/HeaderToolbarContext";
import { AppNotification, User } from "../types";
import { SYSTEM_NAME } from "../navigation";

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
  const { toolbar } = useHeaderToolbar();
  const firstName = currentUser.name.trim().split(/\s+/)[0] || currentUser.name;

  return (
    <header className="app-topbar relative z-30 shrink-0 bg-bg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between px-6 lg:px-8 pt-14 pb-4 lg:pt-4 min-w-0 w-full">
        <div className="min-w-0 flex flex-col">
          <h1 className="app-brand-title leading-tight">{SYSTEM_NAME}</h1>
          <p className="app-brand-greeting">
            Olá, <span className="font-semibold text-text-primary">{firstName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0 lg:pt-0.5 w-full lg:w-auto lg:max-w-[min(100%,52rem)]">
          {toolbar}
          <div className="relative z-40 shrink-0">
            <NotificationCenter
              notifications={notifications}
              currentUserId={currentUser.id}
              onNavigateToRequest={onNavigateToRequest}
              compact
            />
          </div>
        </div>
      </div>
    </header>
  );
}
