/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  getNbCabecalhoBuffer,
  getNbCabecalhoCid,
  getNbCabecalhoMimeType,
} from "./brandAssets";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  includeLogo?: boolean;
}

export interface SendEmailResult {
  provider: "smtp" | "resend";
  messageId?: string;
}

export function getActiveEmailProvider(): "smtp" | "resend" {
  return useSmtpTransport() ? "smtp" : "resend";
}

let resendClient: Resend | null = null;

function useSmtpTransport(): boolean {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  if (provider === "smtp") return true;
  if (provider === "resend") return false;
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY não configurada. Adicione no .env ou use EMAIL_PROVIDER=smtp com SMTP_USER/SMTP_PASS."
    );
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    (useSmtpTransport()
      ? "Neurobots Manutenção <logisticneurobots@gmail.com>"
      : "Neurobots Manutenção <onboarding@resend.dev>")
  );
}

export function getEmailReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}

function resolveSmtpFrom(smtpUser: string): string {
  const configured = process.env.EMAIL_FROM || "";
  const displayMatch = configured.match(/^(.+?)\s*<[^>]+>$/);
  const displayName = displayMatch?.[1]?.trim() || "Neurobots Manutenção";
  const configuredEmail =
    configured.match(/<([^>]+)>/)?.[1]?.trim() ||
    (configured.includes("@") ? configured.trim() : "");

  if (!configuredEmail || configuredEmail.split("@")[1] !== smtpUser.split("@")[1]) {
    return `${displayName} <${smtpUser}>`;
  }
  return configured.includes("<") ? configured : `${displayName} <${configuredEmail}>`;
}

function buildAttachments(params: SendEmailParams): EmailAttachment[] {
  const list: EmailAttachment[] = [...(params.attachments || [])];

  if (params.includeLogo !== false) {
    const cabecalho = getNbCabecalhoBuffer();
    if (cabecalho && !list.some((a) => a.cid === getNbCabecalhoCid())) {
      list.unshift({
        filename: "nbcabecalho.png",
        content: cabecalho,
        contentType: getNbCabecalhoMimeType(),
        cid: getNbCabecalhoCid(),
      });
    }
  }

  return list;
}

function toNodemailerAttachments(attachments: EmailAttachment[]) {
  return attachments.map((att) => {
    if (att.cid) {
      return {
        filename: att.filename,
        content: att.content,
        cid: att.cid,
        contentType: att.contentType,
      };
    }
    return {
      filename: att.filename,
      content: att.content,
      contentType: att.contentType || "application/pdf",
      contentDisposition: "attachment" as const,
    };
  });
}

async function sendViaSmtp(params: SendEmailParams): Promise<SendEmailResult> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error(
      "SMTP_USER e SMTP_PASS são obrigatórios para envio via Gmail. Crie uma senha de app em https://myaccount.google.com/apppasswords"
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const from = resolveSmtpFrom(user);
  const replyTo = getEmailReplyTo() || user;
  const attachments = buildAttachments(params);

  const info = await transporter.sendMail({
    from,
    to: params.to,
    replyTo,
    subject: params.subject,
    text: params.text,
    html: params.html,
    headers: {
      "X-Priority": "3",
      Importance: "normal",
      "X-Mailer": "Neurobots SYS-TECH",
    },
    attachments: toNodemailerAttachments(attachments),
  });

  return { provider: "smtp", messageId: info.messageId };
}

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend();
  const from = getEmailFrom();
  const replyTo = getEmailReplyTo();
  const attachments = buildAttachments(params);

  const { data, error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: replyTo ? [replyTo] : undefined,
    attachments: attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentId: att.cid,
    })),
  });

  if (error) {
    const raw = error.message || "";
    if (raw.includes("domain is not verified") || raw.includes("gmail.com domain")) {
      throw new Error(
        "O Resend exige domínio verificado para este remetente. Use EMAIL_PROVIDER=smtp com Gmail (SMTP_USER/SMTP_PASS) no .env."
      );
    }
    if (raw.includes("only send testing emails")) {
      throw new Error(
        "No Resend, sem domínio verificado só é possível enviar para o e-mail da conta. Use EMAIL_PROVIDER=smtp com Gmail para enviar aos clientes."
      );
    }
    throw new Error(raw || "Falha ao enviar e-mail via Resend.");
  }

  return { provider: "resend", messageId: data?.id };
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // #region agent log
  fetch('http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8ececf'},body:JSON.stringify({sessionId:'8ececf',location:'emailClient.ts:sendEmail',message:'sendEmail called',data:{provider:getActiveEmailProvider(),hasSmtpUser:Boolean(process.env.SMTP_USER),hasSmtpPass:Boolean(process.env.SMTP_PASS),hasResendKey:Boolean(process.env.RESEND_API_KEY),isVercel:Boolean(process.env.VERCEL)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  if (useSmtpTransport()) {
    return sendViaSmtp(params);
  }
  return sendViaResend(params);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
