/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

const NB_CABECALHO_CID = "nbcabecalho@neurobots";

function findFileInPublic(candidates: string[]): string | null {
  const publicDir = path.join(process.cwd(), "public");
  for (const name of candidates) {
    const filePath = path.join(publicDir, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function findNbCabecalhoFile(): string | null {
  return findFileInPublic([
    "nbcabecalho.png",
    "nbcabecalho.jpg",
    "nbcabecalho.jpeg",
    "nbcabecalho.webp",
    "nbcabecalho",
  ]);
}

export function getNbCabecalhoBuffer(): Buffer | null {
  const filePath = findNbCabecalhoFile();
  if (!filePath) return null;
  return fs.readFileSync(filePath);
}

export function getNbCabecalhoMimeType(): string {
  const filePath = findNbCabecalhoFile();
  if (!filePath) return "image/png";
  const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
  if (ext === "jpg") return "image/jpeg";
  return `image/${ext}`;
}

export function getNbCabecalhoUrl(): string {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/nbcabecalho.png`;
}

export function getNbCabecalhoCid(): string {
  return NB_CABECALHO_CID;
}

export function getNbCabecalhoSrcForEmail(): string {
  const buffer = getNbCabecalhoBuffer();
  return buffer ? `cid:${NB_CABECALHO_CID}` : getNbCabecalhoUrl();
}
