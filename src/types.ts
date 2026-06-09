/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Administrador" | "Técnico" | "Usuário";

export interface TechnicalProduct {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profile: UserRole;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  cpfCnpj: string;
  cep?: string;
}

export interface ProductCatalog {
  id: string;
  code: string;
  description: string;
  baseValue: number;
  compatibleProducts?: string[];
  sheetTab?: string;
  sheetSyncedAt?: string;
  costValue?: number;
}

export interface ServiceCatalog {
  id: string;
  code: string;
  description: string;
  baseValue: number;
}

export type KanbanColumnId = "solicitacao" | "orcamento" | "manutencao" | "liberado" | "recusado";

export interface MovementLog {
  id: string;
  fromColumn: KanbanColumnId | "nova_solicitacao";
  toColumn: KanbanColumnId;
  userId: string;
  userName: string;
  timestamp: string; // ISO string
}

export interface BudgetItemProduct {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export interface BudgetItemService {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export interface BudgetPayment {
  status: "none" | "pending" | "paid" | "failed" | "expired";
  method?: "pix" | "credit_card";
  pagarmeOrderId?: string;
  pagarmeChargeId?: string;
  pagarmePaymentLinkId?: string;
  paymentLinkUrl?: string;
  pixQrCode?: string;
  pixQrCodeUrl?: string;
  pixExpiresAt?: string;
  paidAt?: string;
  amountCents: number;
  /** Valor usado ao gerar o link de cartão (independente do PIX). */
  cardLinkAmountCents?: number;
  /** Valor usado ao gerar o PIX copia e cola (independente do cartão). */
  pixAmountCents?: number;
  publicToken?: string;
}

export interface Budget {
  isWarranty: boolean;
  products: BudgetItemProduct[];
  services: BudgetItemService[];
  discount: number;
  subtotal: number;
  shipping?: number;
  shippingService?: string;
  totalFinal: number;
  approvedDate?: string;
  isApproved: boolean;
}

export interface LaborRow {
  id: string;
  operator: string;
  description: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  totalMinutes: number;
}

export interface RatPartRow {
  id: string;
  code: string;
  description: string;
  quantity: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** @deprecated use storagePath + downloadUrl */
  dataUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
}

export interface RAT {
  diagnostic: string;
  labor: LaborRow[];
  parts: RatPartRow[];
  technicalNotes: string;
  attachments: Attachment[];
  status: "Rascunho" | "Finalizado";
  finalizedDate?: string;
  finalInspectionElectric?: "C" | "NC" | "N/A";
  finalInspectionFunctional?: "C" | "NC" | "N/A";
  defectCauses?: string[];
}

export interface PaymentProof {
  fileName: string;
  /** @deprecated use storagePath + downloadUrl */
  fileData?: string;
  storagePath?: string;
  downloadUrl?: string;
  paymentDate: string;
}

export interface ShippingLabel {
  trackingCode: string;
  idPrePostagem: string;
  serviceCode: string;
  serviceName: string;
  generatedAt: string;
  generatedBy?: string;
}

export type EmailDeliveryType = "budget" | "maintenance_started" | "rat" | "tracking";

export type EmailDeliveryStatus = "sent" | "failed" | "skipped";

export type EmailDeliveryTrigger =
  | "manual"
  | "auto_payment"
  | "auto_kanban"
  | "auto_finalize_rat"
  | "auto_shipping";

export interface EmailDeliveryRecord {
  id: string;
  type: EmailDeliveryType;
  status: EmailDeliveryStatus;
  recipient: string;
  subject: string;
  provider: "smtp" | "resend";
  messageId?: string;
  sentAt: string;
  sentBy?: string;
  trigger: EmailDeliveryTrigger;
  error?: string;
  metadata?: { trackingCode?: string };
}

export interface MaintenanceRequest {
  id: string; // e.g., "RAT - 260528-01"
  requestNumber: string; // sequential short name (e.g., "#0001")
  columnId: KanbanColumnId;
  
  // Client references
  clientId: string; // reference to existing client, or newly created
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPhone: string;
  clientEmail: string;
  clientCpfCnpj?: string;
  clientCep?: string;

  // Equipment info
  productName: string; // selected or typed product
  serialNumber: string;
  invoiceDate: string; // NF Date

  // Request description
  openingDate: string; // ISO string or simple YYYY-MM-DD
  problemDescription: string;
  initialDiagnostic: string;

  // Components added dynamically
  budget?: Budget;
  budgetPayment?: BudgetPayment;
  rat?: RAT;
  paymentProof?: PaymentProof;
  shippingLabel?: ShippingLabel;
  releasedDate?: string;

  budgetEmailSentAt?: string;
  budgetEmailSentBy?: string;
  ratEmailSentAt?: string;
  ratEmailSentBy?: string;
  paymentConfirmationEmailSentAt?: string;
  maintenanceStartedEmailSentAt?: string;
  trackingEmailSentAt?: string;
  trackingEmailSentBy?: string;

  emailDeliveries?: EmailDeliveryRecord[];

  /** ISO — orçamento reprovado permanece na coluna Orçamento por até 5 dias no kanban */
  budgetRejectedAt?: string;

  // Activity log tracking movements
  movementHistory: MovementLog[];
}

export type AppNotificationType = "payment_approved";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  requestId: string;
  requestNumber: string;
  clientName: string;
  productName: string;
  totalFinal: number;
  title: string;
  message: string;
  createdAt: string;
  readBy: string[];
}
