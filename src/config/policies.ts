/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PolicyDocument {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  year?: number;
}

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    id: "frete-2026",
    title: "Política de Fretes 2026",
    description: "Diretrizes e regras de frete vigentes para o ano de 2026.",
    pdfUrl: "/politica-frete-2026.pdf",
    year: 2026,
  },
];

export function getPolicyById(id: string): PolicyDocument | undefined {
  return POLICY_DOCUMENTS.find((p) => p.id === id);
}
