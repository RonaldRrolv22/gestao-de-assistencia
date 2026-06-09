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

const BLOCK_BASE = "mt-5 p-4 border-2 rounded-xl text-xs";
const BLOCK_BLUE = `${BLOCK_BASE} border-blue-300 bg-blue-50`;
const BLOCK_BLUE_MUTED = `${BLOCK_BASE} border-blue-200 bg-slate-50`;
const BLOCK_GREEN = `${BLOCK_BASE} border-emerald-300 bg-emerald-50`;
const BLOCK_GREEN_MUTED = `${BLOCK_BASE} border-emerald-200 bg-slate-50`;

function CardBlock({ info, loading }: { info: BudgetPdfPaymentInfo; loading?: boolean }) {
  const header = (
    <div className="flex items-center gap-2 mb-2">
      <CreditCard className="h-5 w-5 text-action-blue shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
        Pagamento com cartão de crédito
      </p>
    </div>
  );

  if (info.autoCardError) {
    return (
      <div className={`${BLOCK_BASE} border-red-200 bg-red-50/50`}>
        {header}
        <p className="text-danger font-semibold">{info.autoCardError}</p>
        <p className="text-text-secondary mt-1">
          Verifique o cadastro do cliente (CPF/CNPJ, endereço, telefone e e-mail) e tente novamente.
        </p>
      </div>
    );
  }

  if (info.cardLinkUrl) {
    return (
      <div className={`${BLOCK_BLUE} space-y-2`}>
        {header}
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          Valor para pagamento
        </p>
        <p className="text-xl font-bold text-text-primary font-mono">{formatCurrency(info.totalFinal)}</p>
        <a
          href={info.cardLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 px-4 py-2.5 bg-action-blue hover:opacity-90 text-white font-bold rounded-lg text-xs"
        >
          Clique aqui para pagar com cartão (até 10x)
        </a>
        <p className="text-[10px] text-action-blue break-all underline">{info.cardLinkUrl}</p>
      </div>
    );
  }

  return (
    <div className={BLOCK_BLUE_MUTED}>
      {header}
      <div className="flex items-center gap-2 text-text-secondary">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-action-blue" />}
        <p className="italic">
          {loading
            ? "Gerando link de pagamento…"
            : "Aguardando geração do link de pagamento."}
        </p>
      </div>
    </div>
  );
}

function PixBlock({ info, loading }: { info: BudgetPdfPaymentInfo; loading?: boolean }) {
  const header = (
    <div className="flex items-center gap-2 mb-2">
      <QrCode className="h-5 w-5 text-emerald-600 shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        Pagamento com PIX
      </p>
    </div>
  );

  if (info.autoPixError) {
    return (
      <div className={`${BLOCK_BASE} border-red-200 bg-red-50/50`}>
        {header}
        <p className="text-danger font-semibold">{info.autoPixError}</p>
        <p className="text-text-secondary mt-1">Verifique o cadastro do cliente e tente novamente.</p>
      </div>
    );
  }

  if (info.pixCopyPaste) {
    return (
      <div className={`${BLOCK_GREEN} space-y-2`}>
        {header}
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          Valor para pagamento
        </p>
        <p className="text-xl font-bold text-text-primary font-mono">{formatCurrency(info.totalFinal)}</p>
        <span className="inline-block mt-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-xs">
          Pagar com PIX
        </span>
        {info.pixQrCodeUrl && (
          <img
            src={info.pixQrCodeUrl}
            alt="QR Code PIX"
            className="max-w-[140px] rounded-lg border border-emerald-200"
          />
        )}
        <p className="text-[10px] text-text-secondary">
          Escaneie o QR Code no app do seu banco ou copie o código abaixo.
        </p>
        <p className="text-[9px] font-mono break-all bg-white border border-emerald-200 rounded-lg p-2 text-text-primary">
          {info.pixCopyPaste}
        </p>
      </div>
    );
  }

  return (
    <div className={BLOCK_GREEN_MUTED}>
      {header}
      <div className="flex items-center gap-2 text-text-secondary">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
        <p className="italic">
          {loading ? "Gerando PIX copia e cola…" : "Aguardando geração do PIX."}
        </p>
      </div>
    </div>
  );
}

export default function BudgetCommercialPaymentBlock({
  info,
  loadingCard,
  loadingPix,
}: BudgetCommercialPaymentBlockProps) {
  const header = (
    <div className="flex items-center gap-2 mb-2">
      <CreditCard className="h-5 w-5 text-action-blue shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Pagamento</p>
    </div>
  );

  if (info.isWarranty) {
    return (
      <div className={BLOCK_BLUE}>
        {header}
        <p className="text-text-secondary">Serviço coberto por garantia — sem pagamento necessário.</p>
      </div>
    );
  }

  if (info.status === "paid") {
    const paidDate = info.paidAt ? new Date(info.paidAt).toLocaleDateString("pt-BR") : null;
    return (
      <div className={BLOCK_BLUE}>
        {header}
        <p className="text-success font-semibold">
          Pagamento confirmado{paidDate ? ` em ${paidDate}` : ""}.
        </p>
      </div>
    );
  }

  if (!info.shippingDefined) {
    return (
      <div className={BLOCK_BLUE_MUTED}>
        {header}
        <p className="text-text-secondary italic">
          Defina o frete no orçamento para gerar as opções de pagamento (cartão e PIX) neste documento.
        </p>
      </div>
    );
  }

  return (
    <>
      <CardBlock info={info} loading={loadingCard} />
      <PixBlock info={info} loading={loadingPix} />
    </>
  );
}
