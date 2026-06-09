/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import ActionButton from "./ActionButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger" | "neutral";
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  icon,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 no-print animate-fade-in">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2.5 bg-slate-100 rounded-xl text-text-secondary shrink-0">{icon}</div>
          )}
          <div>
            <h3 className="font-bold text-sm text-text-primary">{title}</h3>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <ActionButton variant="neutral" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            variant={confirmVariant === "danger" ? "danger" : confirmVariant === "primary" ? "primary" : "neutral"}
            size="sm"
            onClick={onConfirm}
            loading={loading}
            className={confirmVariant === "danger" ? "!bg-slate-800 !text-white !border-slate-800 hover:!bg-slate-700" : ""}
          >
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
