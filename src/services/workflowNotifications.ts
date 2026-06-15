/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppNotification, AppNotificationType, MaintenanceRequest, UserRole } from "../types";
import { createNotification } from "./firestoreService";
import { normalizeUserRole } from "./userRoles";

type NotificationRequest = Pick<
  MaintenanceRequest,
  "id" | "requestNumber" | "clientName" | "productName" | "budget"
>;

function effectiveTotalFinal(request: NotificationRequest): number {
  const total = request.budget?.totalFinal;
  return typeof total === "number" && Number.isFinite(total) ? total : 0;
}

function buildTemplate(
  type: AppNotificationType,
  request: NotificationRequest,
  actorName?: string
): Pick<AppNotification, "title" | "message"> {
  const os = request.requestNumber || request.id;
  const product = request.productName;
  const client = request.clientName;
  const actor = actorName ? ` por ${actorName}` : "";

  switch (type) {
    case "request_created":
      return {
        title: `Nova solicitação — ${os}`,
        message: `${client} registrou uma nova O.S. (${product}). Revise e encaminhe para orçamento.`,
      };
    case "moved_to_orcamento":
      return {
        title: `Orçamento pendente — ${os}`,
        message: `A O.S. ${os} (${product}) foi movida para Orçamento${actor}. Elabore o orçamento.`,
      };
    case "moved_to_manutencao":
      return {
        title: `Manutenção iniciada — ${os}`,
        message: `A O.S. ${os} (${product}) está na baia de Manutenção${actor}. Inicie o atendimento técnico.`,
      };
    case "payment_approved":
      return {
        title: `Pagamento confirmado — ${os}`,
        message: `O pagamento da O.S. ${os} (${product}) foi aprovado. O equipamento seguiu para manutenção.`,
      };
    case "rat_finalized":
      return {
        title: `RAT finalizada — ${os}`,
        message: `A RAT da O.S. ${os} (${product}) foi finalizada${actor}. Libere o equipamento quando estiver pronto.`,
      };
    case "moved_to_liberado":
      return {
        title: `Equipamento liberado — ${os}`,
        message: `A O.S. ${os} (${product}) foi liberada${actor}. Acompanhe envio e pós-venda.`,
      };
    default:
      return {
        title: `Atualização — ${os}`,
        message: `Há uma nova atualização na O.S. ${os} (${product}).`,
      };
  }
}

export function filterNotificationsForUser(
  notifications: AppNotification[],
  profile: string
): AppNotification[] {
  const role = normalizeUserRole(profile);
  return notifications.filter((n) => {
    if (!n.targetRoles?.length) return false;
    return n.targetRoles.includes(role);
  });
}

export async function createWorkflowNotification(params: {
  type: AppNotificationType;
  request: NotificationRequest;
  targetRoles: UserRole[];
  actorName?: string;
}): Promise<void> {
  const { type, request, targetRoles, actorName } = params;
  if (!targetRoles.length) return;

  const id = `wf-${type}-${request.id}-${Date.now()}`;
  const { title, message } = buildTemplate(type, request, actorName);

  const notification: AppNotification = {
    id,
    type,
    requestId: request.id,
    requestNumber: request.requestNumber,
    clientName: request.clientName,
    productName: request.productName,
    totalFinal: effectiveTotalFinal(request),
    title,
    message,
    createdAt: new Date().toISOString(),
    readBy: [],
    targetRoles,
    ...(actorName ? { actorName } : {}),
  };

  await createNotification(notification);
}
