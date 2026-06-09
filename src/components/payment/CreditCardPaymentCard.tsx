/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { BudgetPayment } from "../../types";
import { formatCurrency } from "../../utils";
import ActionButton from "../ui/ActionButton";

interface CreditCardPaymentCardProps {
  payment: BudgetPayment;
  loading: boolean;
  onRegenerate: () => void;
  onCopy: (text: string) => void;
}

export default function CreditCardPaymentCard({
  payment,
  loading,
  onRegenerate,
  onCopy,
}: CreditCardPaymentCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-bold text-text-primary text-sm">Cartão de crédito</h4>
          <p className="text-xs text-text-secondary mt-1">
            Parcelamento até <strong>10x</strong> (mín. {formatCurrency(5)} por parcela)
          </p>
        </div>
        <ActionButton
          variant="neutral"
          size="sm"
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onRegenerate}
        >
          Gerar novo link
        </ActionButton>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Link de pagamento</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={payment.paymentLinkUrl || ""}
            className="flex-1 text-xs font-mono border border-border rounded-xl p-3 bg-slate-50"
          />
          <ActionButton
            variant="secondary"
            size="sm"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => onCopy(payment.paymentLinkUrl || "")}
          >
            Copiar
          </ActionButton>
        </div>
      </div>

      {payment.paymentLinkUrl && (
        <a
          href={payment.paymentLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-action-blue hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir checkout Pagar.me
        </a>
      )}
    </div>
  );
}
