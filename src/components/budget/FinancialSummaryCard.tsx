/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Loader2, MapPin, Truck } from "lucide-react";
import { formatCurrency } from "../../utils";
import SummaryCard from "../ui/SummaryCard";
import {
  BUDGET_BLOCK,
  BUDGET_BTN_PRIMARY,
  BUDGET_ICON_WRAP,
  BUDGET_INPUT,
  BUDGET_LABEL,
  BUDGET_TOTAL_HERO,
} from "./budgetModalStyles";

interface FinancialSummaryCardProps {
  subtotalServices: number;
  subtotalProducts: number;
  shipping: number;
  discount: number;
  calculatedTotal: number;
  calculatedSubtotal: number;
  isWarranty: boolean;
  canEdit: boolean;
  shippingService: string;
  shippingCep: string;
  cepError: string;
  shippingLoading: boolean;
  onDiscountChange: (value: number) => void;
  onShippingCepChange: (value: string) => void;
  onCalculateShipping: () => void;
}

export default function FinancialSummaryCard({
  subtotalServices,
  subtotalProducts,
  shipping,
  discount,
  calculatedTotal,
  calculatedSubtotal,
  isWarranty,
  canEdit,
  shippingService,
  shippingCep,
  cepError,
  shippingLoading,
  onDiscountChange,
  onShippingCepChange,
  onCalculateShipping,
}: FinancialSummaryCardProps) {
  return (
    <SummaryCard title="Resumo financeiro" subtitle="Subtotais e total final" sticky>
      <div className="space-y-3">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal serviços</span>
            <span className="font-mono">{formatCurrency(subtotalServices)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Subtotal peças</span>
            <span className="font-mono">{formatCurrency(subtotalProducts)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Frete</span>
            <span
              className={`font-mono font-semibold ${
                shipping > 0
                  ? "text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200"
                  : "text-slate-600"
              }`}
            >
              {formatCurrency(shipping)}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className={BUDGET_BLOCK}>
            <div className="flex items-center gap-2.5">
              <span className={BUDGET_ICON_WRAP}>
                <Truck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-800">Calcular frete</p>
                <p className="text-[10px] text-slate-500">Necessário para continuar o fluxo de pagamento</p>
              </div>
            </div>
            <div>
              <label className={`${BUDGET_LABEL} flex items-center gap-1`}>
                <MapPin className="h-3 w-3" />
                CEP de entrega
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ex: 01001-000"
                  value={shippingCep}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    let masked = clean;
                    if (clean.length > 5) masked = `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
                    onShippingCepChange(masked);
                  }}
                  className={`${BUDGET_INPUT} text-center font-mono sm:flex-1 ${
                    cepError ? "border-red-400 bg-red-50/30 ring-2 ring-red-500/10" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={onCalculateShipping}
                  disabled={shippingLoading}
                  className={`${BUDGET_BTN_PRIMARY} w-full sm:w-auto sm:shrink-0`}
                >
                  {shippingLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Calcular frete"
                  )}
                </button>
              </div>
              {shippingLoading && (
                <p className="text-[10px] text-slate-600 font-semibold mt-1.5">Consultando Melhor Envio...</p>
              )}
              {cepError && <p className="text-[10px] text-danger font-semibold mt-1.5">{cepError}</p>}
            </div>
          </div>
        )}

        <div className={BUDGET_BLOCK}>
          <label htmlFor="input-budget-discount" className={BUDGET_LABEL}>
            Desconto
          </label>
          {isWarranty ? (
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide py-2">
              Cobertura integral
            </p>
          ) : canEdit ? (
            <input
              type="number"
              min="0"
              max={calculatedSubtotal + shipping}
              id="input-budget-discount"
              value={discount}
              onChange={(e) =>
                onDiscountChange(Math.min(calculatedSubtotal + shipping, parseFloat(e.target.value) || 0))
              }
              className={`${BUDGET_INPUT} w-full text-right font-bold font-mono`}
              placeholder="0,00"
            />
          ) : (
            <p className={`${BUDGET_INPUT} w-full text-right font-mono font-bold bg-slate-50`}>
              {formatCurrency(discount)}
            </p>
          )}
        </div>

        {isWarranty && (
          <div className="bg-slate-100 text-slate-700 text-[10px] p-2.5 rounded-xl border border-slate-200 font-sans leading-relaxed">
            {calculatedTotal > 0 ? (
              <>
                <strong>Garantia com frete:</strong> peças e serviços isentos; apenas o frete será cobrado via PIX.
              </>
            ) : (
              <>
                <strong>Garantia ativada:</strong> valores apresentados, mas o total foi zerado por cobertura.
              </>
            )}
          </div>
        )}

        <div className={BUDGET_TOTAL_HERO}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total final</p>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(calculatedTotal)}
          </p>
        </div>

        {shipping > 0 && shippingService && (
          <p className="text-[10px] text-slate-500 font-sans text-right no-print">
            Frete: <strong className="text-slate-700">{formatCurrency(shipping)}</strong> — {shippingService}
          </p>
        )}
      </div>
    </SummaryCard>
  );
}
