/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { BudgetPdfPaymentInfo } from "../../utils/budgetCommercialPdf";
import { formatCurrency } from "../../utils";

interface BudgetCommercialPaymentBlockProps {
  info: BudgetPdfPaymentInfo;
  loading?: boolean;
}

const CONTACT_LINE = "contato@neurobots.com.br • (81) 98254-2262";

const BLOCK_BASE = "mt-5 p-4 border-2 rounded-xl text-xs";
const BLOCK_BLUE = `${BLOCK_BASE} border-blue-300 bg-blue-50`;
const BLOCK_BLUE_MUTED = `${BLOCK_BASE} border-blue-200 bg-slate-50`;

function PixNote() {
  return (
    <p className="text-text-secondary text-[10px] pt-2 mt-2 border-t border-dashed border-blue-200 leading-relaxed">
      <strong>Prefere pagar via PIX?</strong> Entre em contato com nossa equipe: {CONTACT_LINE}
    </p>
  );
}

export default function BudgetCommercialPaymentBlock({ info, loading }: BudgetCommercialPaymentBlockProps) {
  const header = (
    <div className="flex items-center gap-2 mb-2">
      <CreditCard className="h-5 w-5 text-action-blue shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
        Pagamento com cartão de crédito
      </p>
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
        <PixNote />
      </div>
    );
  }

  if (!info.shippingDefined) {
    return (
      <div className={BLOCK_BLUE_MUTED}>
        {header}
        <p className="text-text-secondary italic">
          Defina o frete no orçamento para gerar o link de pagamento neste documento.
        </p>
        <PixNote />
      </div>
    );
  }

  if (info.autoCardError) {
    return (
      <div className={`${BLOCK_BASE} border-red-200 bg-red-50/50`}>
        {header}
        <p className="text-danger font-semibold">{info.autoCardError}</p>
        <p className="text-text-secondary mt-1">
          Verifique o cadastro do cliente (CPF/CNPJ, endereço, telefone e e-mail) e tente novamente.
        </p>
        <PixNote />
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
        <PixNote />
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
      <PixNote />
    </div>
  );
}
