/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import ActionButton from "./ActionButton";

interface PasswordConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}

export default function PasswordConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Informe sua senha para continuar.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senha incorreta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 no-print animate-fade-in">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 rounded-xl text-text-secondary shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text-primary">{title}</h3>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password-confirm-input" className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
            Sua senha
          </label>
          <input
            id="password-confirm-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleConfirm()}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/25"
            placeholder="Digite sua senha"
            disabled={loading}
          />
          {error && <p className="text-[11px] text-danger font-medium">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 text-xs">
          <ActionButton variant="neutral" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            variant="danger"
            size="sm"
            onClick={() => void handleConfirm()}
            loading={loading}
            className="!bg-slate-800 !text-white !border-slate-800 hover:!bg-slate-700"
          >
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
