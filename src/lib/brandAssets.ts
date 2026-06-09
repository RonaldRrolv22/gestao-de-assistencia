/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

const NB_CABECALHO_CID = "nbcabecalho@neurobots";
const NB_CABECALHO_CANDIDATES = [
  "nbcabecalho.png",
  "nbcabecalho.jpg",
  "nbcabecalho.jpeg",
  "nbcabecalho.webp",
  "nbcabecalho",
];

let cachedNbCabecalhoPath: string | null | undefined;

function assetSearchDirs(): string[] {
  const cwd = process.cwd();
  return [path.join(cwd, "public"), path.join(cwd, "dist")];
}

function findFileInAssetDirs(candidates: string[]): string | null {
  for (const dir of assetSearchDirs()) {
    for (const name of candidates) {
      const filePath = path.join(dir, name);
      if (fs.existsSync(filePath)) return filePath;
    }
  }
  return null;
}

function findNbCabecalhoFile(): string | null {
  if (cachedNbCabecalhoPath !== undefined) {
    return cachedNbCabecalhoPath;
  }
  cachedNbCabecalhoPath = findFileInAssetDirs(NB_CABECALHO_CANDIDATES);
  return cachedNbCabecalhoPath;
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
  const src = buffer ? `cid:${NB_CABECALHO_CID}` : getNbCabecalhoUrl();
  if (!buffer) {
    console.warn("[brandAssets] nbcabecalho não encontrado em public/ ou dist/; usando URL externa no e-mail.");
  }
  return src;
}
