/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { triggerEquipmentReceivedEmail } from "../services/documentEmailApi";
import { appNoticeSuccess, appNoticeWarning } from "./appNotice";

export async function notifyEquipmentReceivedIfDateChanged(
  requestId: string,
  previousDate: string | undefined,
  newDate: string | undefined
): Promise<void> {
  const prev = previousDate?.trim() || "";
  const next = newDate?.trim() || "";
  if (!next || next === prev) return;

  try {
    const result = await triggerEquipmentReceivedEmail(requestId);
    if (result.status === "failed" || (result.error && !result.skipped)) {
      appNoticeWarning(
        `Data salva, mas falha ao enviar e-mail: ${result.error || "erro desconhecido"}`
      );
    } else if (!result.skipped && result.sentTo) {
      appNoticeSuccess(`E-mail de recebimento enviado para ${result.sentTo}.`);
    }
  } catch (err) {
    appNoticeWarning(
      err instanceof Error ? err.message : "Falha ao enviar e-mail de recebimento."
    );
  }
}
