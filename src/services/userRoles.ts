/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../types";

/** E-mails que recebem perfil Administrador automaticamente no primeiro login. */
export const SUPER_ADMIN_EMAILS = [
  "ronald.oliveira@neurobots.com.br",
  "yasmin.oliveira@neurobots.com",
];

/** E-mails protegidos contra exclusão no sistema. */
export const PROTECTED_USER_EMAILS = [
  ...SUPER_ADMIN_EMAILS,
];

export function isAdminProfile(profile: string): boolean {
  return profile === "Administrador";
}

export function isTechnicianProfile(profile: string): boolean {
  return profile === "Técnico";
}

export function isUsuarioProfile(profile: string): boolean {
  return profile === "Usuário";
}

/** Relatórios: todos os perfis autenticados. */
export function canAccessReports(_profile: string): boolean {
  return true;
}

/** Hub de Testes: Técnico e Administrador. */
export function canAccessHubTestes(profile: string): boolean {
  return isAdminProfile(profile) || isTechnicianProfile(profile);
}

/** Orçamento — mover card e fluxo comercial completo: Usuário e Administrador. */
export function canEditBudget(profile: string): boolean {
  return canManageBudgetCommercial(profile);
}

/** Fluxo comercial do orçamento (aprovar, recusar, e-mail, pagamento, frete): Usuário e Administrador. */
export function canManageBudgetCommercial(profile: string): boolean {
  return isAdminProfile(profile) || isUsuarioProfile(profile);
}

/** Montagem técnica do orçamento (itens, tipo de assistência e rascunho): Técnico, Usuário e Administrador. */
export function canDraftBudget(profile: string): boolean {
  return isAdminProfile(profile) || isUsuarioProfile(profile) || isTechnicianProfile(profile);
}

export function canMoveToOrcamento(profile: string): boolean {
  return canDraftBudget(profile);
}

/** RAT — editar e finalizar: Técnico e Administrador. */
export function canEditRat(profile: string): boolean {
  return isAdminProfile(profile) || isTechnicianProfile(profile);
}

/** Diagnóstico técnico na O.S. (triagem): Técnico e Administrador. */
export function canEditTechnicalDiagnostic(profile: string): boolean {
  return isAdminProfile(profile) || isTechnicianProfile(profile);
}

/** Liberação do equipamento e coluna Liberado: somente Administrador. */
export function canReleaseEquipment(profile: string): boolean {
  return isAdminProfile(profile);
}

/** Clientes — cadastrar e editar: Usuário e Administrador. */
export function canManageClients(profile: string): boolean {
  return isAdminProfile(profile) || isUsuarioProfile(profile);
}

/** Clientes — excluir: somente Administrador. */
export function canDeleteClients(profile: string): boolean {
  return isAdminProfile(profile);
}

/** Acesso operacional ao Kanban, RAT e fluxo de campo. */
export function hasOperationalAccess(profile: string): boolean {
  return profile === "Administrador" || profile === "Técnico" || profile === "Usuário";
}

/** E-mails com perfil Técnico conhecido (cadastro manual). */
export const TECHNICIAN_EMAILS: string[] = [];

export function resolveProfileForEmail(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(normalized)) {
    return "Administrador";
  }
  if (TECHNICIAN_EMAILS.includes(normalized)) {
    return "Técnico";
  }
  return "Usuário";
}

export function shouldUpgradeToAdmin(email: string, currentProfile: string): boolean {
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(normalized) && currentProfile !== "Administrador";
}

export function normalizeUserRole(profile: string): UserRole {
  if (profile === "Administrador" || profile === "Técnico" || profile === "Usuário") {
    return profile;
  }
  return "Usuário";
}
