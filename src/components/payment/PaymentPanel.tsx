/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertCircle, Copy, CreditCard, QrCode, Loader2 } from "lucide-react";
import { BudgetPayment } from "../../types";
import { formatCurrency } from "../../utils";
import SummaryCard from "../ui/SummaryCard";
import StatusBadge, { StatusBadgeVariant } from "../ui/StatusBadge";
import { BUDGET_METHOD_ACTIVE, BUDGET_METHOD_IDLE } from "../budget/budgetModalStyles";

const STATUS_MAP: Record<BudgetPayment["status"], { label: string; variant: StatusBadgeVariant }> = {
  none: { label: "Aguardando geração", variant: "neutral" },
  pending: { label: "Pendente", variant: "pending" },
  paid: { label: "Pago", variant: "paid" },
  failed: { label: "Falhou", variant: "failed" },
  expired: { label: "Expirado", variant: "expired" },
};

interface PaymentPanelProps {
  totalFinal: number;
  shipping?: number;
  payment?: BudgetPayment;
  compact?: boolean;
  publicToken?: boolean;
  error: string | null;
  message: string | null;
  syncingPix: boolean;
  pixAmountMismatch: boolean;
  pixAmountCents: number;
  pixExpired: boolean;
  loadingPix: boolean;
  loadingCard: boolean;
  loadingVerify: boolean;
  loadingLink: boolean;
  publicUrl: string | null;
  onGeneratePix: () => void;
  onGenerateCard: () => void;
  onPublicLink: () => void;
  onVerify: () => void;
  onRefreshPix: () => void;
  onCopy: (text: string) => void;
}

export default function PaymentPanel({
  totalFinal,
  shipping = 0,
  payment,
  error,
  message,
  syncingPix,
  pixAmountMismatch,
  pixAmountCents,
  pixExpired,
  loadingPix,
  loadingCard,
  onGeneratePix,
  onGenerateCard,
  onRefreshPix,
  onCopy,
}: PaymentPanelProps) {
  const status = STATUS_MAP[payment?.status || "none"];
  const hasPix = !!payment?.pixQrCode && !pixExpired;
  const hasCard = !!payment?.paymentLinkUrl;
  const [selectedMethod, setSelectedMethod] = useState<"pix" | "card">("pix");

  const handlePixClick = () => {
    setSelectedMethod("pix");
    if (pixAmountMismatch) {
      onRefreshPix();
      return;
    }
    if (!hasPix) {
      onGeneratePix();
    }
  };

  const handleCardClick = () => {
    setSelectedMethod("card");
    if (!hasCard) {
      onGenerateCard();
    }
  };

  return (
    <SummaryCard
      title="Pagamento"
      subtitle="PIX e cartão de crédito via Pagar.me"
      headerAction={
        <StatusBadge variant={status.variant} compact className="uppercase tracking-wider">
          {status.label}
        </StatusBadge>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Valor total</p>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">{formatCurrency(totalFinal)}</p>
        </div>

        {shipping <= 0 && !hasCard && !hasPix && (
          <div className="flex gap-2.5 text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>Defina o frete para gerar as opções de pagamento.</span>
          </div>
        )}
        {error && (
          <div className="text-danger bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs">{error}</div>
        )}
        {message && (
          <div className="text-slate-700 bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs">{message}</div>
        )}
        {pixAmountMismatch && !syncingPix && (
          <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
            Valor alterado ({formatCurrency(pixAmountCents / 100)} → {formatCurrency(totalFinal)}).
            Clique em &quot;Pagar com PIX&quot; para gerar um novo código.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loadingPix || syncingPix}
            onClick={handlePixClick}
            className={selectedMethod === "pix" ? BUDGET_METHOD_ACTIVE : BUDGET_METHOD_IDLE}
          >
            {loadingPix || syncingPix ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <QrCode className="h-5 w-5" />
            )}
            <span>Pagar com PIX</span>
          </button>
          <button
            type="button"
            disabled={loadingCard}
            onClick={handleCardClick}
            className={selectedMethod === "card" ? BUDGET_METHOD_ACTIVE : BUDGET_METHOD_IDLE}
          >
            {loadingCard ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            <span className="text-center leading-tight">Pagar com cartão de crédito</span>
          </button>
        </div>

        {selectedMethod === "pix" && hasPix && !pixAmountMismatch && (
          <div className="space-y-3 pt-1">
            {payment?.pixQrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={payment.pixQrCodeUrl}
                  alt="QR Code PIX"
                  className="max-w-[180px] w-full rounded-xl border border-emerald-200 shadow-sm"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Código copia e cola
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={payment?.pixQrCode || ""}
                  className="flex-1 text-xs font-mono border border-slate-200 rounded-xl p-3 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => onCopy(payment?.pixQrCode || "")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === "card" && hasCard && payment?.paymentLinkUrl && (
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Link de pagamento
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={payment.paymentLinkUrl}
                className="flex-1 text-xs font-mono border border-slate-200 rounded-xl p-3 bg-slate-50"
              />
              <button
                type="button"
                onClick={() => onCopy(payment.paymentLinkUrl || "")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </SummaryCard>
  );
}
