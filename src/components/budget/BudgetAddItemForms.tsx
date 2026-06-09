/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Plus } from "lucide-react";
import { ProductCatalog, ServiceCatalog } from "../../types";
import { formatCurrency } from "../../utils";
import SummaryCard from "../ui/SummaryCard";
import { BUDGET_BTN_ICON, BUDGET_INPUT, BUDGET_LABEL, BUDGET_QTY_INPUT } from "./budgetModalStyles";

interface BudgetAddItemFormsProps {
  filteredProductsCatalog: ProductCatalog[];
  servicesCatalog: ServiceCatalog[];
  selectedProductId: string;
  productQty: number;
  selectedServiceId: string;
  serviceQty: number;
  onProductIdChange: (id: string) => void;
  onProductQtyChange: (qty: number) => void;
  onServiceIdChange: (id: string) => void;
  onServiceQtyChange: (qty: number) => void;
  onAddProduct: () => void;
  onAddService: () => void;
}

function AddItemRow({
  selectId,
  qtyId,
  btnId,
  selectValue,
  qtyValue,
  placeholder,
  options,
  onSelectChange,
  onQtyChange,
  onAdd,
  addLabel,
}: {
  selectId: string;
  qtyId: string;
  btnId: string;
  selectValue: string;
  qtyValue: number;
  placeholder: string;
  options: { id: string; label: string }[];
  onSelectChange: (id: string) => void;
  onQtyChange: (qty: number) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <select
        id={selectId}
        value={selectValue}
        onChange={(e) => onSelectChange(e.target.value)}
        className={`${BUDGET_INPUT} font-medium`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="flex items-end gap-2">
        <div className="shrink-0">
          <label htmlFor={qtyId} className={BUDGET_LABEL}>
            Qtd
          </label>
          <input
            type="number"
            min="1"
            id={qtyId}
            value={qtyValue}
            onChange={(e) => onQtyChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className={BUDGET_QTY_INPUT}
            aria-label="Quantidade"
          />
        </div>
        <button
          type="button"
          id={btnId}
          className={`${BUDGET_BTN_ICON} self-end`}
          onClick={onAdd}
          aria-label={addLabel}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function BudgetAddItemForms({
  filteredProductsCatalog,
  servicesCatalog,
  selectedProductId,
  productQty,
  selectedServiceId,
  serviceQty,
  onProductIdChange,
  onProductQtyChange,
  onServiceIdChange,
  onServiceQtyChange,
  onAddProduct,
  onAddService,
}: BudgetAddItemFormsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SummaryCard title="Peças / Produtos" subtitle="Catálogo compatível com o equipamento">
        <AddItemRow
          selectId="select-budget-product"
          qtyId="input-budget-product-qty"
          btnId="btn-add-budget-product"
          selectValue={selectedProductId}
          qtyValue={productQty}
          placeholder="-- Selecione a peça --"
          options={filteredProductsCatalog.map((p) => ({
            id: p.id,
            label: `${p.code} - ${p.description} (${formatCurrency(p.baseValue)})`,
          }))}
          onSelectChange={onProductIdChange}
          onQtyChange={onProductQtyChange}
          onAdd={onAddProduct}
          addLabel="Adicionar peça"
        />
      </SummaryCard>

      <SummaryCard title="Mão de obra / Serviços" subtitle="Serviços técnicos do catálogo">
        <AddItemRow
          selectId="select-budget-service"
          qtyId="input-budget-service-qty"
          btnId="btn-add-budget-service"
          selectValue={selectedServiceId}
          qtyValue={serviceQty}
          placeholder="-- Selecione o serviço --"
          options={servicesCatalog.map((s) => ({
            id: s.id,
            label: `${s.code} - ${s.description} (${formatCurrency(s.baseValue)})`,
          }))}
          onSelectChange={onServiceIdChange}
          onQtyChange={onServiceQtyChange}
          onAdd={onAddService}
          addLabel="Adicionar serviço"
        />
      </SummaryCard>
    </div>
  );
}
