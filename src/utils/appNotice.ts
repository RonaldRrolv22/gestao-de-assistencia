/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppNoticeVariant = "error" | "warning" | "success" | "info";

export interface AppNoticeOptions {
  title?: string;
  message: string;
  variant?: AppNoticeVariant;
}

export interface AppNoticeState {
  open: boolean;
  title: string;
  message: string;
  variant: AppNoticeVariant;
}

const DEFAULT_TITLES: Record<AppNoticeVariant, string> = {
  error: "Não foi possível continuar",
  warning: "Atenção",
  success: "Concluído",
  info: "Informação",
};

type NoticeListener = (state: AppNoticeState) => void;

let listener: NoticeListener | null = null;

export function registerAppNoticeListener(fn: NoticeListener | null): void {
  listener = fn;
}

export function appNotice(options: AppNoticeOptions): void {
  const variant = options.variant ?? "info";
  listener?.({
    open: true,
    title: options.title ?? DEFAULT_TITLES[variant],
    message: options.message,
    variant,
  });
}

export function appNoticeError(message: string, title?: string): void {
  appNotice({ message, title, variant: "error" });
}

export function appNoticeWarning(message: string, title?: string): void {
  appNotice({ message, title, variant: "warning" });
}

export function appNoticeSuccess(message: string, title?: string): void {
  appNotice({ message, title, variant: "success" });
}
