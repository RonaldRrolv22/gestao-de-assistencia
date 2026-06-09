/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server";

let appHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appHandler) {
    const app = await createApp();
    appHandler = (request, response) => app(request, response);
  }
  return appHandler(req, res);
}
