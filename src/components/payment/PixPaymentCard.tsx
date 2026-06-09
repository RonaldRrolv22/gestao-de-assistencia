/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Copy, RefreshCw } from "lucide-react";
import { BudgetPayment } from "../../types";
import { formatCurrency } from "../../utils";
import ActionButton from "../ui/ActionButton";
import CountdownTimer from "../ui/CountdownTimer";

interface PixPaymentCardProps {
  payment: BudgetPayment;
  totalFinal: number;
  loading: boolean;
  pixExpired: boolean;
  onRefresh: () => void;
  onCopy: (text: string) => void;
  onExpire: () => void;
}

export default function PixPaymentCard({
  payment,
  totalFinal,
  loading,
  pixExpired,
  onRefresh,
  onCopy,
  onExpire,
}: PixPaymentCardProps) {
  const amount = (payment.amountCents ?? 0) / 100;
  const mismatch = Math.round(totalFinal * 100) !== payment.amountCents;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-bold text-text-primary text-sm">PIX</h4>
          <p className="text-xs text-text-secondary mt-1">
            Valor cobrado: <strong className="text-text-primary">{formatCurrency(amount)}</strong>
            {mismatch && <span className="text-amber-700 ml-1">(orçamento: {formatCurrency(totalFinal)})</span>}
          </p>
        </div>
        <ActionButton
          variant="neutral"
          size="sm"
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onRefresh}
        >
          {pixExpired ? "Gerar novo PIX" : "Atualizar PIX"}
        </ActionButton>
      </div>

      {payment.pixQrCodeUrl && !pixExpired && (
        <div className="flex justify-center py-2">
          <img
            src={payment.pixQrCodeUrl}
            alt="QR Code PIX"
            className="max-w-[240px] w-full rounded-xl border border-border shadow-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Código copia e cola</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={payment.pixQrCode || ""}
            disabled={pixExpired}
            className="flex-1 text-xs font-mono border border-border rounded-xl p-3 bg-slate-50 disabled:opacity-50"
          />
          <ActionButton
            variant="secondary"
            size="sm"
            disabled={pixExpired}
            icon={<Copy className="h-4 w-4" />}
            onClick={() => onCopy(payment.pixQrCode || "")}
          >
            Copiar
          </ActionButton>
        </div>
      </div>

      <CountdownTimer expiresAt={payment.pixExpiresAt} onExpire={onExpire} />
    </div>
  );
}
