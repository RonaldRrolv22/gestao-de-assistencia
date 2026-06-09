/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeneratePdfOptions {
  format?: "A4" | "Letter";
  marginMm?: number;
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });
}

/** Renderiza HTML exatamente como na tela (modo web) e exporta para PDF. */
export async function generatePdfFromHtml(
  html: string,
  options?: GeneratePdfOptions
): Promise<Buffer> {
  const format = options?.format ?? "A4";
  const margin = options?.marginMm ?? 8;

  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    const hint =
      err instanceof Error && /Could not find Chrome|Failed to launch/i.test(err.message)
        ? " Instale o Chrome ou execute: npx puppeteer browsers install chrome"
        : "";
    throw new Error(`Não foi possível iniciar o navegador para gerar o PDF.${hint}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 880, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });

    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );
    });

    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
