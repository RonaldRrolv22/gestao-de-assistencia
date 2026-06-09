/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Mail, MailCheck, MailX, MailWarning } from "lucide-react";
import { EmailDeliveryType, MaintenanceRequest } from "../../types";
import {
  EmailStatusInfo,
  getEmailStatusesForRequest,
  isEmailApplicable,
} from "../../utils/emailDeliveryStatus";

interface EmailStatusIconsProps {
  request: MaintenanceRequest;
  types: EmailDeliveryType[];
  className?: string;
  size?: "sm" | "md";
}

const ICON_CLASS: Record<EmailStatusInfo["status"], string> = {
  sent: "text-emerald-600",
  failed: "text-red-500",
  skipped: "text-amber-500",
  pending: "text-slate-300",
};

function StatusIcon({ status }: { status: EmailStatusInfo["status"] }) {
  const cls = `w-3.5 h-3.5 shrink-0 ${ICON_CLASS[status]}`;
  switch (status) {
    case "sent":
      return <MailCheck className={cls} aria-hidden />;
    case "failed":
      return <MailX className={cls} aria-hidden />;
    case "skipped":
      return <MailWarning className={cls} aria-hidden />;
    default:
      return <Mail className={cls} aria-hidden />;
  }
}

export default function EmailStatusIcons({
  request,
  types,
  className = "",
  size = "sm",
}: EmailStatusIconsProps) {
  const applicable = types.filter((type) => isEmailApplicable(request, type));
  if (applicable.length === 0) return null;

  const statuses = getEmailStatusesForRequest(request, applicable);
  const gap = size === "sm" ? "gap-1" : "gap-1.5";

  return (
    <div
      className={`inline-flex items-center ${gap} ${className}`}
      role="group"
      aria-label="Status dos e-mails enviados ao cliente"
    >
      {statuses.map((info) => (
        <span
          key={info.type}
          title={info.tooltip}
          className="inline-flex items-center gap-0.5 rounded-md bg-white/80 px-1 py-0.5 border border-slate-100"
        >
          <StatusIcon status={info.status} />
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide hidden sm:inline">
            {info.label.slice(0, 3)}
          </span>
        </span>
      ))}
    </div>
  );
}
