/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { AppNotification, AppNotificationType } from "../types";
import { formatCurrency } from "../utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/firestoreService";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FilePlus,
  Wrench,
  X,
} from "lucide-react";
import StatusBadge from "./ui/StatusBadge";

function notificationIcon(type: AppNotificationType) {
  switch (type) {
    case "request_created":
      return FilePlus;
    case "moved_to_orcamento":
      return ClipboardList;
    case "moved_to_manutencao":
      return Wrench;
    case "payment_approved":
      return CreditCard;
    case "rat_finalized":
      return ClipboardList;
    case "moved_to_liberado":
      return CheckCircle2;
    default:
      return Bell;
  }
}

interface NotificationCenterProps {
  notifications: AppNotification[];
  currentUserId: string;
  onNavigateToRequest?: (requestId: string) => void;
  compact?: boolean;
}

export default function NotificationCenter({
  notifications,
  currentUserId,
  onNavigateToRequest,
  compact = false,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.readBy?.includes(currentUserId));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleRead = async (notification: AppNotification) => {
    if (!notification.readBy?.includes(currentUserId)) {
      await markNotificationRead(notification.id, currentUserId);
    }
    setOpen(false);
    onNavigateToRequest?.(notification.requestId);
  };

  const handleMarkAllRead = async () => {
    const ids = unread.map((n) => n.id);
    if (ids.length > 0) {
      await markAllNotificationsRead(ids, currentUserId);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center justify-center rounded-lg border text-text-secondary hover:text-text-primary transition-all duration-200 ${
          compact
            ? "w-9 h-9 border-border/60 bg-white hover:bg-slate-50"
            : "w-10 h-10 border-border/80 bg-card/90 hover:bg-brand-active-bg/40 hover:border-brand-orange/20 btn-premium-secondary"
        }`}
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-brand-gradient text-white text-[9px] font-bold shadow-glow-orange">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,380px)] bg-card border border-border rounded-2xl shadow-premium z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50/80">
            <div>
              <p className="text-sm font-bold text-heading">Notificações</p>
              <p className="text-[10px] text-text-secondary">
                {unread.length > 0
                  ? `${unread.length} não lida${unread.length > 1 ? "s" : ""}`
                  : "Tudo em dia"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg hover:bg-white text-text-secondary hover:text-text-primary transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white text-text-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-text-secondary">
                Nenhuma notificação por enquanto.
              </p>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readBy?.includes(currentUserId);
                const Icon = notificationIcon(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleRead(n)}
                    className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-slate-50/80 transition-colors duration-150 ${
                      isUnread ? "bg-brand-active-bg/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isUnread ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-text-primary leading-snug">{n.title}</p>
                          {isUnread && <StatusBadge variant="pending">Nova</StatusBadge>}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-text-secondary/80 mt-1.5">
                          {n.clientName}
                          {n.totalFinal > 0 ? ` • ${formatCurrency(n.totalFinal)}` : ""}
                          {" • "}
                          {new Date(n.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
