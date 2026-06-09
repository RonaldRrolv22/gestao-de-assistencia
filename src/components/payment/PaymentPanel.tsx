/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Link2, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { BudgetPayment } from "../../types";
import { formatCurrency } from "../../utils";
import SummaryCard from "../ui/SummaryCard";
import StatusBadge, { StatusBadgeVariant } from "../ui/StatusBadge";
import ActionButton from "../ui/ActionButton";
import PixPaymentCard from "./PixPaymentCard";
import CreditCardPaymentCard from "./CreditCardPaymentCard";
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
  onPixExpire: () => void;
  onCopy: (text: string) => void;
}

const TAB_ACTIVE = "bg-brand-active-bg text-brand-active-text border border-amber-200/60 font-semibold";
const TAB_IDLE = "text-text-secondary hover:bg-slate-50 border border-transparent";

export default function PaymentPanel({
  totalFinal,
  shipping = 0,
  payment,
  compact,
  publicToken,
  error,
  message,
  syncingPix,
  pixAmountMismatch,
  pixAmountCents,
  pixExpired,
  loadingPix,
  loadingCard,
  loadingVerify,
  loadingLink,
  publicUrl,
  onGeneratePix,
  onGenerateCard,
  onPublicLink,
  onVerify,
  onRefreshPix,
  onPixExpire,
  onCopy,
}: PaymentPanelProps) {
  const status = STATUS_MAP[payment?.status || "none"];
  const [selectedMethod, setSelectedMethod] = useState<"pix" | "card">("pix");
  const [activeTab, setActiveTab] = useState<"pix" | "card">("pix");

  const showPix = !!payment?.pixQrCode;
  const showCard = !!payment?.paymentLinkUrl;

  useEffect(() => {
    if (showPix && !showCard) {
      setActiveTab("pix");
      setSelectedMethod("pix");
    } else if (showCard && !showPix) {
      setActiveTab("card");
      setSelectedMethod("card");
    }
  }, [showPix, showCard]);

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
      <div className="space-y-5">
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 p-4 sm:p-5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Valor total</p>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">{formatCurrency(totalFinal)}</p>
        </div>

        {shipping <= 0 && !showCard && !showPix && (
          <div className="flex gap-2.5 text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>Defina o frete para gerar automaticamente as opções de pagamento (cartão e PIX).</span>
          </div>
        )}
        {shipping > 0 && (showCard || showPix) && (
          <div className="flex gap-2.5 text-emerald-900 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs leading-relaxed">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              {showCard && showPix
                ? "Cartão e PIX gerados automaticamente ao definir o frete."
                : showCard
                  ? "Link de cartão gerado automaticamente ao definir o frete."
                  : "PIX gerado automaticamente ao definir o frete."}
            </span>
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
            O valor do orçamento mudou ({formatCurrency(pixAmountCents / 100)} → {formatCurrency(totalFinal)}).
            Clique em &quot;Atualizar PIX&quot; para gerar um novo código.
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Método de pagamento
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loadingPix}
              onClick={() => {
                setSelectedMethod("pix");
                onGeneratePix();
              }}
              className={selectedMethod === "pix" ? BUDGET_METHOD_ACTIVE : BUDGET_METHOD_IDLE}
            >
              {loadingPix ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              <span>Gerar PIX</span>
            </button>
            <button
              type="button"
              disabled={loadingCard}
              onClick={() => {
                setSelectedMethod("card");
                onGenerateCard();
              }}
              className={selectedMethod === "card" ? BUDGET_METHOD_ACTIVE : BUDGET_METHOD_IDLE}
            >
              {loadingCard ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              <span>Gerar pagamento com cartão</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {!publicToken && (
            <ActionButton variant="secondary" size="sm" loading={loadingLink} icon={<Link2 className="h-4 w-4" />} onClick={onPublicLink}>
              Copiar link para cliente
            </ActionButton>
          )}
          <ActionButton variant="neutral" size="sm" loading={loadingVerify} icon={<RefreshCw className="h-4 w-4" />} onClick={onVerify}>
            Verificar pagamento
          </ActionButton>
        </div>

        {(showPix || showCard) && (
          <div className="flex gap-1 border-b border-slate-200 pb-0">
            {showPix && (
              <button
                type="button"
                onClick={() => setActiveTab("pix")}
                className={`px-4 py-2 rounded-t-lg text-xs transition-colors ${activeTab === "pix" ? TAB_ACTIVE : TAB_IDLE}`}
              >
                PIX
              </button>
            )}
            {showCard && (
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`px-4 py-2 rounded-t-lg text-xs transition-colors ${activeTab === "card" ? TAB_ACTIVE : TAB_IDLE}`}
              >
                Cartão
              </button>
            )}
          </div>
        )}

        {showPix && activeTab === "pix" && (
          <PixPaymentCard
            payment={payment}
            totalFinal={totalFinal}
            loading={loadingPix}
            pixExpired={pixExpired}
            onRefresh={onRefreshPix}
            onCopy={onCopy}
            onExpire={onPixExpire}
          />
        )}

        {showCard && activeTab === "card" && (
          <CreditCardPaymentCard
            payment={payment}
            loading={loadingCard}
            onRegenerate={onGenerateCard}
            onCopy={onCopy}
          />
        )}

        {publicUrl && !publicToken && !compact && (
          <p className="text-[10px] text-slate-500 break-all border-t border-slate-100 pt-3">
            Link cliente: {publicUrl}
          </p>
        )}
      </div>
    </SummaryCard>
  );
}
