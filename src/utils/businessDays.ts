/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isBusinessDay(date: Date): boolean {
  const weekday = date.getDay();
  return weekday !== 0 && weekday !== 6;
}

/** Soma N dias úteis a partir da data de referência (sábado e domingo não contam). */
export function addBusinessDays(start: Date, businessDays: number): Date {
  const result = toDateOnly(start);
  if (businessDays <= 0) return result;

  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      added += 1;
    }
  }
  return result;
}

/** Dias úteis entre duas datas (exclusivo de `from`, inclusivo de `to`). */
export function countBusinessDaysBetween(from: Date, to: Date): number {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (end <= start) return 0;

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= end) {
    if (isBusinessDay(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Dias úteis restantes até o prazo (inclusivo do dia limite). */
export function businessDaysRemaining(from: Date, deadline: Date): number {
  return countBusinessDaysBetween(from, deadline);
}

/** Dias úteis de atraso após o prazo. */
export function businessDaysOverdue(deadline: Date, from: Date): number {
  return countBusinessDaysBetween(deadline, from);
}

export function formatBrDate(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}
