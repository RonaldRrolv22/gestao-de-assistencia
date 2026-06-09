/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Paleta quente do dashboard de relatórios (amarelo → laranja → vermelho). */

export const WARM_COLORS = {
  yellow: "#FBBF24",
  yellowSoft: "#FDE68A",
  orangeLight: "#FFAB66",
  orange: "#FF8C42",
  orangeBrand: "#E84E00",
  orangeDeep: "#C43D00",
  amber: "#F59E0B",
  redSoft: "#F87171",
  red: "#DC2626",
  redDeep: "#B91C1C",
} as const;

export const KPI_WARM_VARIANT = {
  revenue: {
    iconClass: "bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.28)]",
    sparkStroke: WARM_COLORS.amber,
    sparkFill: "rgba(245,158,11,0.18)",
    hintClass: "text-amber-700",
  },
  maintenance: {
    iconClass: "bg-gradient-to-br from-[#FFAB66] to-[#FF8C42] shadow-[0_2px_8px_rgba(255,140,66,0.28)]",
    sparkStroke: WARM_COLORS.orange,
    sparkFill: "rgba(255,140,66,0.15)",
    hintClass: "text-slate-500",
  },
  resolution: {
    iconClass: "bg-gradient-to-br from-[#FF8C42] to-[#E84E00] shadow-[0_2px_8px_rgba(232,78,0,0.28)]",
    sparkStroke: WARM_COLORS.orangeBrand,
    sparkFill: "rgba(232,78,0,0.14)",
    hintClass: "text-slate-500",
  },
  warranty: {
    iconClass: "bg-gradient-to-br from-red-300 to-red-500 shadow-[0_2px_8px_rgba(220,38,38,0.22)]",
    sparkStroke: WARM_COLORS.red,
    sparkFill: "rgba(220,38,38,0.12)",
    hintClass: "text-red-600",
  },
} as const;

export const OPERATION_STAGE_COLORS = {
  solicitacao: WARM_COLORS.yellow,
  orcamento: WARM_COLORS.orangeLight,
  manutencao: WARM_COLORS.orangeBrand,
  liberado: WARM_COLORS.orangeDeep,
} as const;

export const DONUT_WARM_PALETTE = [
  WARM_COLORS.orangeBrand,
  WARM_COLORS.orange,
  WARM_COLORS.amber,
  WARM_COLORS.orangeLight,
  WARM_COLORS.redSoft,
];
