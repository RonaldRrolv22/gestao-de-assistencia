/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format numbers as Brazilian Real currency (BRL)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Format ISO string to Portuguese Date string (DD/MM/YYYY)
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    // Adjust timezone offsets if necessary, but standard localized is fine
    return date.toLocaleDateString("pt-BR", {
      timeZone: "UTC"
    });
  } catch (e) {
    return dateString;
  }
}

// Format ISO string to complete Portuguese DateTime string (DD/MM/YYYY HH:MM)
export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

// Download dynamic content as a CSV file (Brazilian Excel standard using semicolon separation)
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const content = [
    headers.join(";"),
    ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
