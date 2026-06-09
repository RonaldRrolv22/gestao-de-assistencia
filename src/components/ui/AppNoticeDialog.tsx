/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import ActionButton from "./ActionButton";
import { AppNoticeVariant } from "../../utils/appNotice";

interface AppNoticeDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant: AppNoticeVariant;
  onClose: () => void;
}

const VARIANT_STYLES: Record<
  AppNoticeVariant,
  { icon: React.ReactNode; iconWrap: string; accent: string }
> = {
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    iconWrap: "bg-red-50 text-red-600 border border-red-100",
    accent: "text-red-700",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconWrap: "bg-amber-50 text-amber-600 border border-amber-100",
    accent: "text-amber-800",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconWrap: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    accent: "text-emerald-800",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    iconWrap: "bg-sky-50 text-sky-600 border border-sky-100",
    accent: "text-sky-800",
  },
};

export default function AppNoticeDialog({
  open,
  title,
  message,
  variant,
  onClose,
}: AppNoticeDialogProps) {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 no-print animate-fade-in">
      <div
        role="alertdialog"
        aria-labelledby="app-notice-title"
        aria-describedby="app-notice-message"
        className="bg-card rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-5 animate-slide-up"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${styles.iconWrap}`}>{styles.icon}</div>
          <div className="min-w-0">
            <h3 id="app-notice-title" className={`font-bold text-sm ${styles.accent}`}>
              {title}
            </h3>
            <p
              id="app-notice-message"
              className="text-[12px] text-text-secondary mt-1.5 leading-relaxed whitespace-pre-wrap"
            >
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <ActionButton variant="primary" size="sm" onClick={onClose}>
            OK
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
