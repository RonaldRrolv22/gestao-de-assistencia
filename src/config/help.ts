/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TRAINING_MANUAL = {
  title: "Manual de Treinamento — Gestão da Assistências",
  pdfUrl: encodeURI("/Manual de Treinamento - Gestão da Assistências (1).pdf"),
};

export function pdfViewerUrl(url: string): string {
  return `${url}#page=1&zoom=page-width`;
}
