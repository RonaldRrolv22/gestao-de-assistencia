/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { BudgetPdfPaymentInfo } from "../../utils/budgetCommercialPdf";
import { formatCurrency } from "../../utils";

interface BudgetCommercialPaymentBlockProps {
  info: BudgetPdfPaymentInfo;
  loadingCard?: boolean;
  loadingPix?: boolean;
}

const BLOCK_BASE = "mt-5 p-4 border-2 rounded-xl text-xs text-center";
const BLOCK_BLUE = `${BLOCK_BASE} border-blue-300 bg-blue-50`;
const BLOCK_BLUE_MUTED = `${BLOCK_BASE} border-blue-200 bg-slate-50`;
const BLOCK_GREEN = `${BLOCK_BASE} border-emerald-300 bg-emerald-50`;
const BLOCK_GREEN_MUTED = `${BLOCK_BASE} border-emerald-200 bg-slate-50`;

function CardBlock({ info, loading }: { info: BudgetPdfPaymentInfo; loading?: boolean }) {
  if (info.autoCardError) {
    return (
      <div className={`${BLOCK_BASE} border-red-200 bg-red-50/50 text-left`}>
        <p className="text-danger font-semibold">{info.autoCardError}</p>
      </div>
    );
  }

  if (info.cardLinkUrl) {
    return (
      <div className={BLOCK_BLUE}>
        <CreditCard className="h-5 w-5 text-action-blue mx-auto mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">Cartão de crédito</p>
        <p className="text-lg font-bold font-mono mb-2">{formatCurrency(info.totalFinal)}</p>
        <p className="inline-block px-4 py-2 bg-action-blue text-white font-bold rounded-lg text-xs">
          Pagar com cartão de crédito
        </p>
      </div>
    );
  }

  return (
    <div className={BLOCK_BLUE_MUTED}>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-action-blue mx-auto mb-2" />}
      <p className="text-text-secondary italic">{loading ? "Gerando…" : "Aguardando link de cartão."}</p>
    </div>
  );
}

function PixBlock({ info, loading }: { info: BudgetPdfPaymentInfo; loading?: boolean }) {
  if (info.autoPixError) {
    return (
      <div className={`${BLOCK_BASE} border-red-200 bg-red-50/50 text-left`}>
        <p className="text-danger font-semibold">{info.autoPixError}</p>
      </div>
    );
  }

  if (info.pixCopyPaste) {
    return (
      <div className={BLOCK_GREEN}>
        <QrCode className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">PIX</p>
        <p className="text-lg font-bold font-mono mb-2">{formatCurrency(info.totalFinal)}</p>
        {info.pixQrCodeUrl && (
          <img
            src={info.pixQrCodeUrl}
            alt="QR Code PIX"
            className="max-w-[120px] mx-auto rounded-lg border border-emerald-200 mb-2"
          />
        )}
        <p className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs">
          Pagar com PIX
        </p>
      </div>
    );
  }

  return (
    <div className={BLOCK_GREEN_MUTED}>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 mx-auto mb-2" />}
      <p className="text-text-secondary italic">{loading ? "Gerando…" : "Aguardando PIX."}</p>
    </div>
  );
}

export default function BudgetCommercialPaymentBlock({
  info,
  loadingCard,
  loadingPix,
}: BudgetCommercialPaymentBlockProps) {
  if (info.isWarranty) {
    return (
      <div className={`${BLOCK_BLUE} text-left`}>
        <p className="text-text-secondary">Serviço coberto por garantia — sem pagamento necessário.</p>
      </div>
    );
  }

  if (info.status === "paid") {
    const paidDate = info.paidAt ? new Date(info.paidAt).toLocaleDateString("pt-BR") : null;
    return (
      <div className={`${BLOCK_BLUE} text-left`}>
        <p className="text-success font-semibold">
          Pagamento confirmado{paidDate ? ` em ${paidDate}` : ""}.
        </p>
      </div>
    );
  }

  if (!info.shippingDefined) {
    return (
      <div className={`${BLOCK_BLUE_MUTED} text-left`}>
        <p className="text-text-secondary italic">Defina o frete para exibir as opções de pagamento no documento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CardBlock info={info} loading={loadingCard} />
      <PixBlock info={info} loading={loadingPix} />
    </div>
  );
}
