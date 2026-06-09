/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Tokens visuais compartilhados do modal de Orçamentação Técnica (paleta monocromática laranja/slate). */

export const BUDGET_INPUT =
  "w-full text-slate-900 px-3 py-2.5 border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-brand-orange/45 focus:ring-2 focus:ring-brand-orange/15 text-xs min-h-[42px]";

/** Campo de quantidade — largura fixa e borda mais visível. */
export const BUDGET_QTY_INPUT =
  "w-20 sm:w-24 shrink-0 text-center font-mono font-semibold text-sm text-slate-900 px-2 py-2.5 border-2 border-slate-300 rounded-xl bg-slate-50/80 transition-all duration-200 focus:outline-none focus:border-brand-orange/55 focus:ring-2 focus:ring-brand-orange/15 focus:bg-white min-h-[42px]";

export const BUDGET_LABEL =
  "block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

/** Bloco interno (frete, desconto) — slate neutro, sem azul. */
export const BUDGET_BLOCK =
  "rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-2.5 no-print";

export const BUDGET_SEGMENTED_WRAP =
  "inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/90 shrink-0";

export const BUDGET_SEGMENTED_ACTIVE =
  "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-white text-slate-900 border border-slate-200 shadow-sm";

export const BUDGET_SEGMENTED_IDLE =
  "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-500 hover:text-slate-700 hover:bg-white/60 border border-transparent";

/** Botão primário — gradiente laranja (padrão da tela). */
export const BUDGET_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wide bg-brand-gradient text-white border border-transparent shadow-sm hover:opacity-95 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-orange/30 min-h-[42px]";

/** Botão ícone (+) — mesmo gradiente, quadrado. */
export const BUDGET_BTN_ICON =
  "inline-flex items-center justify-center shrink-0 w-[42px] h-[42px] rounded-xl bg-brand-gradient text-white border border-transparent shadow-sm hover:opacity-95 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 cursor-pointer disabled:opacity-50";

export const BUDGET_METHOD_ACTIVE =
  "flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 bg-brand-gradient text-white border border-orange-300/50 shadow-md shadow-orange-200/30 ring-2 ring-brand-orange/20";

export const BUDGET_METHOD_IDLE =
  "flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed";

/** @deprecated use BUDGET_BLOCK */
export const BUDGET_FRETE_BLOCK = BUDGET_BLOCK;

/** Botão calcular frete — gradiente laranja padrão. */
export const BUDGET_FRETE_BTN = BUDGET_BTN_PRIMARY;

export const BUDGET_TOTAL_HERO =
  "rounded-xl bg-gradient-to-br from-orange-50 via-white to-orange-50/30 border border-orange-200/60 p-5 mt-2 shadow-sm";

export const BUDGET_ICON_WRAP =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 text-brand-orange border border-orange-200/60 shrink-0";
