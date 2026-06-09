/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { TechnicalProduct } from "../../types";

export interface KanbanSearchControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  equipmentFilter: string;
  onEquipmentFilterChange: (value: string) => void;
  showEquipDropdown: boolean;
  onToggleEquipDropdown: () => void;
  onCloseEquipDropdown: () => void;
  technicalProducts?: TechnicalProduct[];
  uniqueProducts: string[];
  variant?: "header" | "standalone";
}

export default function KanbanSearchControls({
  searchTerm,
  onSearchChange,
  equipmentFilter,
  onEquipmentFilterChange,
  showEquipDropdown,
  onToggleEquipDropdown,
  onCloseEquipDropdown,
  technicalProducts,
  uniqueProducts,
  variant = "standalone",
}: KanbanSearchControlsProps) {
  const isHeader = variant === "header";
  const filterActiveClass =
    "bg-brand-active-bg/60 border-brand-orange/30 text-brand-orange";
  const filterIdleClass =
    "bg-white border-border/70 text-text-secondary hover:bg-slate-50 hover:text-text-primary hover:border-border";

  const productOptions =
    technicalProducts && technicalProducts.length > 0
      ? technicalProducts.map((tp) => tp.name)
      : uniqueProducts;

  const searchInput = (
    <div className={`relative min-w-0 ${isHeader ? "flex-1 min-w-[16rem] sm:min-w-[20rem] lg:min-w-[24rem]" : "flex-1"}`}>
      <Search className="h-4 w-4 text-text-secondary/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        id="global-search"
        placeholder="Buscar O.S., cliente, empresa ou S/N..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full h-9 pl-10 pr-3 text-sm text-text-primary bg-white border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/40 placeholder:text-text-secondary/60 transition-all"
      />
    </div>
  );

  const filterButton = (
    <div className="relative shrink-0">
      <button
        type="button"
        id="btn-filter-equipments"
        onClick={onToggleEquipDropdown}
        className={`h-9 px-3.5 border rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm font-medium ${
          equipmentFilter ? filterActiveClass : filterIdleClass
        }`}
        title={equipmentFilter ? `Filtrando: ${equipmentFilter}` : "Filtrar por equipamento"}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline">Filtro</span>
        {equipmentFilter && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
        )}
      </button>

      {showEquipDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseEquipDropdown} />
          <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-premium p-2 z-50 text-xs max-h-72 overflow-y-auto animate-slide-up">
            <div className="px-3 py-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
              Equipamento
            </div>
            <button
              type="button"
              onClick={() => {
                onEquipmentFilterChange("");
                onCloseEquipDropdown();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                equipmentFilter === "" ? filterActiveClass : "hover:bg-slate-50 text-text-secondary"
              }`}
            >
              <span>Todos</span>
              {equipmentFilter === "" && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
              )}
            </button>
            {productOptions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onEquipmentFilterChange(name);
                  onCloseEquipDropdown();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all mt-0.5 flex items-center justify-between cursor-pointer ${
                  equipmentFilter === name ? filterActiveClass : "hover:bg-slate-50 text-text-secondary"
                }`}
              >
                <span className="truncate">{name}</span>
                {equipmentFilter === name && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (isHeader) {
    return (
      <div className="flex items-center gap-2 w-full min-w-0 glass-toolbar rounded-xl p-1.5">
        {searchInput}
        {filterButton}
      </div>
    );
  }

  return (
    <div className="px-6 pt-5 pb-4 shrink-0">
      <div className="glass-toolbar rounded-xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {searchInput}
        {filterButton}
      </div>
    </div>
  );
}
